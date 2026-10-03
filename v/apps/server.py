"""Local Haven server: static site, filesystem browser, CBZ access, and MPV launcher."""
from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import re
import shutil
import string
import subprocess
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlsplit
import tempfile

ROOT = Path(__file__).resolve().parent
VIDEO_EXTENSIONS = {".mkv", ".mp4", ".webm", ".avi", ".mov", ".m4v", ".ogv", ".mpv"}
TRANSCODE_DIR = Path(tempfile.gettempdir()) / "Haven" / "browser-videos"
UPLOAD_DIR = Path(tempfile.gettempdir()) / "Haven" / "uploaded-videos"
TRANSCODE_LOCKS: dict[str, threading.Lock] = {}
TRANSCODE_JOBS: dict[str, dict] = {}
TRANSCODE_STATE_LOCK = threading.Lock()


def natural_key(value: str):
    return [int(part) if part.isdigit() else part.casefold() for part in re.split(r"(\d+)", value)]


def find_mpv() -> str | None:
    candidates = [shutil.which("mpv.exe"), shutil.which("mpv"), r"C:\mpv\mpv.exe"]
    return next((item for item in candidates if item and Path(item).is_file()), None)


def find_ffmpeg(name: str = "ffmpeg.exe") -> str | None:
    local = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData/Local"))
    candidates = [shutil.which(name), str(local / "Haven/ffmpeg/unpacked/ffmpeg-9.0.2-essentials_build/bin" / name)]
    return next((item for item in candidates if item and Path(item).is_file()), None)


def videos_in_folder(folder: Path) -> list[str]:
    videos = [str(path) for path in folder.rglob("*") if path.is_file() and path.suffix.casefold() in VIDEO_EXTENSIONS]
    return sorted(videos, key=lambda path: natural_key(str(Path(path).relative_to(folder))))


def transcode_key(source: Path) -> str:
    stat = source.stat()
    key = f"haven-video-v2\0{source.resolve()}\0{stat.st_size}\0{stat.st_mtime_ns}".encode("utf-8", errors="surrogatepass")
    return hashlib.sha256(key).hexdigest()


def probe_video(source: Path) -> dict:
    ffprobe = find_ffmpeg("ffprobe.exe")
    if not ffprobe:
        return {"streams": [], "duration": 0.0}
    result = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration", "-show_entries", "stream=codec_type,codec_name,pix_fmt", "-of", "json", str(source)],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=60,
    )
    if result.returncode:
        return {"streams": [], "duration": 0.0}
    data = json.loads(result.stdout.decode("utf-8", errors="replace"))
    try:
        data["duration"] = float(data.get("format", {}).get("duration", 0))
    except (TypeError, ValueError):
        data["duration"] = 0.0
    return data


def set_transcode_job(key: str, **values):
    with TRANSCODE_STATE_LOCK:
        TRANSCODE_JOBS[key] = {**TRANSCODE_JOBS.get(key, {}), **values}


def video_status(source: Path) -> dict:
    key = transcode_key(source)
    output = TRANSCODE_DIR / f"{key}.mp4"
    if output.is_file() and output.stat().st_size:
        return {"state": "ready", "progress": 100}
    with TRANSCODE_STATE_LOCK:
        return dict(TRANSCODE_JOBS.get(key, {"state": "waiting", "progress": 0}))


def browser_video(source: Path) -> Path:
    """Keep browser-safe streams; make an H.264/AAC copy of unsupported video."""
    source = source.resolve(strict=True)
    media = probe_video(source)
    streams = media.get("streams", [])
    video_streams = [stream for stream in streams if stream.get("codec_type") == "video"]
    audio_streams = [stream for stream in streams if stream.get("codec_type") == "audio"]
    if source.suffix.casefold() in {".mp4", ".m4v"} and video_streams and all(stream.get("codec_name") == "h264" and stream.get("pix_fmt") in {"yuv420p", "yuvj420p"} for stream in video_streams) and all(stream.get("codec_name") in {"aac", "mp3"} for stream in audio_streams):
        return source
    if source.suffix.casefold() == ".webm" and video_streams and all(stream.get("codec_name") in {"vp8", "vp9", "av1"} for stream in video_streams) and all(stream.get("codec_name") in {"opus", "vorbis"} for stream in audio_streams):
        return source
    if source.suffix.casefold() in {".mp4", ".m4v", ".webm"} and not find_ffmpeg("ffprobe.exe"):
        return source
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("FFmpeg is unavailable. Restart Haven or install FFmpeg to play this video in the browser.")
    TRANSCODE_DIR.mkdir(parents=True, exist_ok=True)
    key = transcode_key(source)
    output = TRANSCODE_DIR / f"{key}.mp4"
    if output.is_file() and output.stat().st_size > 0:
        return output
    with TRANSCODE_STATE_LOCK:
        lock = TRANSCODE_LOCKS.setdefault(key, threading.Lock())
    with lock:
        if output.is_file() and output.stat().st_size > 0:
            return output
        temporary = TRANSCODE_DIR / f"{key}.{threading.get_ident()}.part.mp4"
        temporary.unlink(missing_ok=True)
        set_transcode_job(key, state="converting", progress=0)
        video_codec = video_streams[0].get("codec_name") if video_streams else None
        video_args = ["-c:v", "copy"] if video_codec == "h264" else ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "23", "-pix_fmt", "yuv420p"]
        audio_args = ["-c:a", "copy"] if audio_streams and audio_streams[0].get("codec_name") in {"aac", "mp3"} else ["-c:a", "aac", "-b:a", "160k"]
        def convert(options: list[str]) -> tuple[int, list[str]]:
            command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-map", "0:v:0", "-map", "0:a:0?", *options, *audio_args, "-movflags", "+faststart", "-progress", "pipe:1", "-nostats", str(temporary)]
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
            messages = []
            for line in process.stdout or []:
                messages.append(line)
                if len(messages) > 40:
                    messages.pop(0)
                if line.startswith("out_time_us=") and media.get("duration"):
                    try:
                        progress = min(99, int(int(line.split("=", 1)[1]) / 1_000_000 / media["duration"] * 100))
                        set_transcode_job(key, state="converting", progress=progress)
                    except ValueError:
                        pass
            return process.wait(), messages

        result, log = convert(video_args)
        if result and "h264_nvenc" in video_args:
            temporary.unlink(missing_ok=True)
            set_transcode_job(key, state="converting", progress=0, note="Using CPU because the NVIDIA driver is incompatible")
            result, log = convert(["-c:v", "libx264", "-preset", "ultrafast", "-crf", "25", "-pix_fmt", "yuv420p"])
        if result or not temporary.is_file() or not temporary.stat().st_size:
            temporary.unlink(missing_ok=True)
            reason = "".join(log)[-1200:].strip()
            set_transcode_job(key, state="error", progress=0, error="Conversion failed")
            raise RuntimeError("FFmpeg could not convert this file." + (f" {reason}" if reason else ""))
        os.replace(temporary, output)
        set_transcode_job(key, state="ready", progress=100)
    return output


def browser_subtitles(source: Path) -> Path | None:
    """Extract the first embedded subtitle track for the browser, when available."""
    ffmpeg = find_ffmpeg()
    if not ffmpeg or not source.is_file():
        return None
    TRANSCODE_DIR.mkdir(parents=True, exist_ok=True)
    output = TRANSCODE_DIR / f"{transcode_key(source)}.vtt"
    if output.is_file():
        return output if output.stat().st_size else None
    result = subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-map", "0:s:0", "-c:s", "webvtt", str(output)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=None)
    if result.returncode or not output.is_file():
        output.unlink(missing_ok=True)
        return None
    return output if output.stat().st_size else None


def cbz_in_folder(folder: Path) -> list[Path]:
    books = [path for path in folder.rglob("*") if path.is_file() and path.suffix.casefold() == ".cbz"]
    return sorted(books, key=lambda path: natural_key(str(path.relative_to(folder))))


def available_roots() -> list[dict[str, str]]:
    roots = []
    home = Path.home()
    roots.append({"name": "Home", "path": str(home)})
    for name in ("Downloads", "Documents", "Videos", "Pictures"):
        candidate = home / name
        if candidate.is_dir():
            roots.append({"name": name, "path": str(candidate)})
    for letter in string.ascii_uppercase:
        drive = Path(f"{letter}:\\")
        if drive.is_dir():
            roots.append({"name": f"{letter}: drive", "path": str(drive)})
    unique = {item["path"].casefold(): item for item in roots}
    return list(unique.values())


def browse_folder(raw_path: str | None) -> dict:
    folder = Path(raw_path).expanduser().resolve() if raw_path else Path.home().resolve()
    if not folder.is_dir():
        raise ValueError("That folder does not exist.")
    directories = []
    try:
        for child in folder.iterdir():
            try:
                if child.is_dir():
                    directories.append({"name": child.name, "path": str(child)})
            except OSError:
                continue
    except PermissionError as exc:
        raise ValueError("Haven cannot open that protected folder.") from exc
    directories.sort(key=lambda item: natural_key(item["name"]))
    parent = str(folder.parent) if folder.parent != folder else None
    return {"path": str(folder), "parent": parent, "directories": directories, "roots": available_roots()}


class HavenHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        request = urlsplit(self.path)
        query = parse_qs(request.query)
        try:
            if request.path == "/api/mpv/status":
                self.send_json(200, {"available": bool(find_mpv())})
                return
            if request.path == "/api/folders":
                folder = browse_folder(query.get("path", [None])[0])
                if query.get("videos") == ["1"]:
                    folder["videos"] = [{"name": str(Path(item).relative_to(folder["path"])), "path": item} for item in videos_in_folder(Path(folder["path"]))]
                self.send_json(200, folder)
                return
            if request.path == "/api/folder-videos":
                folder = Path(query.get("path", [""])[0]).expanduser().resolve()
                if not folder.is_dir():
                    raise ValueError("That video folder does not exist.")
                videos = videos_in_folder(folder)
                items = [{"name": str(Path(item).relative_to(folder)), "src": "/api/video?path=" + quote(item, safe=""), "status": "/api/video-status?path=" + quote(item, safe=""), "subtitles": "/api/video-subtitles?path=" + quote(item, safe="") if Path(item).suffix.casefold() in {".mkv", ".m4v", ".mp4", ".mov", ".avi", ".mpv"} else None} for item in videos]
                self.send_json(200, {"videos": items})
                return
            if request.path == "/api/video-status":
                source = Path(query.get("path", [""])[0]).expanduser().resolve(strict=True)
                if source.suffix.casefold() not in VIDEO_EXTENSIONS or not source.is_file():
                    raise ValueError("That video file is unavailable.")
                self.send_json(200, video_status(source))
                return
            if request.path == "/api/video":
                source = Path(query.get("path", [""])[0]).expanduser().resolve(strict=True)
                if source.suffix.casefold() not in VIDEO_EXTENSIONS or not source.is_file():
                    raise ValueError("That video file is unavailable.")
                self.send_video(browser_video(source))
                return
            if request.path == "/api/video-subtitles":
                source = Path(query.get("path", [""])[0]).expanduser().resolve(strict=True)
                subtitle = browser_subtitles(source)
                if not subtitle:
                    self.send_response(204)
                    self.end_headers()
                    return
                self.send_video(subtitle, "text/vtt; charset=utf-8")
                return
            if request.path == "/api/cbz-file":
                self.send_cbz(query.get("path", [""])[0])
                return
        except (OSError, ValueError, RuntimeError) as exc:
            self.send_json(400, {"error": str(exc)})
            return
        super().do_GET()

    def do_POST(self):
        request = urlsplit(self.path)
        if request.path == "/api/video-upload":
            destination = None
            try:
                length = int(self.headers.get("Content-Length", "0"))
                original = Path(parse_qs(request.query).get("name", ["episode.mkv"])[0]).name
                if length < 1 or Path(original).suffix.casefold() != ".mkv":
                    raise ValueError("Choose one MKV video file.")
                UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
                token = hashlib.sha256(os.urandom(32)).hexdigest()[:16]
                destination = UPLOAD_DIR / f"{token}-{original}"
                remaining = length
                with destination.open("wb") as target:
                    while remaining:
                        chunk = self.rfile.read(min(1024 * 1024, remaining))
                        if not chunk:
                            raise ValueError("The MKV upload stopped before it finished.")
                        target.write(chunk)
                        remaining -= len(chunk)
                encoded = quote(str(destination), safe="")
                self.send_json(200, {"video": {"name": original, "src": "/api/video?path=" + encoded, "status": "/api/video-status?path=" + encoded, "subtitles": "/api/video-subtitles?path=" + encoded}})
            except (OSError, ValueError) as exc:
                if destination:
                    destination.unlink(missing_ok=True)
                self.send_json(400, {"error": str(exc)})
            return
        if request.path not in {"/api/mpv/open-folder", "/api/manga/cbz-folder"}:
            self.send_error(404)
            return
        try:
            payload = self.read_json()
            folder = Path(payload.get("path", "")).expanduser().resolve()
            if not folder.is_dir():
                raise ValueError("Choose an existing folder.")
            if request.path == "/api/manga/cbz-folder":
                books = cbz_in_folder(folder)
                self.send_json(200, {"count": len(books), "books": [{"name": str(path.relative_to(folder)), "path": str(path)} for path in books]})
                return
            mpv = find_mpv()
            if not mpv:
                raise RuntimeError("MPV was not found on this computer.")
            videos = videos_in_folder(folder)
            if not videos:
                self.send_json(200, {"opened": False, "message": "No supported video files were found in that folder."})
                return
            args = [mpv, "--loop-playlist=inf", "--sub-auto=all", "--sid=1", "--save-position-on-quit", "--force-window=yes", "--", *videos]
            subprocess.Popen(args, cwd=str(folder))
            self.send_json(200, {"opened": True, "count": len(videos)})
        except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
            self.send_json(400, {"opened": False, "error": str(exc)})

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length < 2 or length > 65536:
            raise ValueError("Invalid request.")
        value = json.loads(self.rfile.read(length).decode("utf-8"))
        if not isinstance(value, dict):
            raise ValueError("Invalid request.")
        return value

    def send_cbz(self, raw_path: str):
        path = Path(unquote(raw_path)).expanduser().resolve()
        if not path.is_file() or path.suffix.casefold() != ".cbz":
            raise ValueError("That CBZ file is unavailable.")
        size = path.stat().st_size
        self.send_response(200)
        self.send_header("Content-Type", "application/vnd.comicbook+zip")
        self.send_header("Content-Length", str(size))
        self.end_headers()
        with path.open("rb") as source:
            shutil.copyfileobj(source, self.wfile)

    def send_json(self, status: int, value: dict):
        body = json.dumps(value).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_video(self, path: Path, content_type: str | None = None):
        size = path.stat().st_size
        mime = content_type or mimetypes.guess_type(path.name)[0] or "video/mp4"
        header = self.headers.get("Range")
        if header:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", header.strip())
            if not match:
                self.send_error(416)
                return
            first, last = match.groups()
            start = int(first) if first else max(0, size - int(last or "0"))
            end = min(size - 1, int(last)) if last else size - 1
            if start >= size or end < start:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.end_headers()
                return
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            start, end = 0, size - 1
            self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        with path.open("rb") as source:
            source.seek(start)
            remaining = end - start + 1
            while remaining:
                chunk = source.read(min(128 * 1024, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)


if __name__ == "__main__":
    os.chdir(ROOT)
    print("Haven is available at http://127.0.0.1:4180", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 4180), HavenHandler).serve_forever()
