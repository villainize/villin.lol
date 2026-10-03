# Haven

A local apps home with a manga reader, anime player, and writing bookshelf. No build step or account required.

Double-click `start-server.bat`, then visit http://127.0.0.1:4180. Keep the server window open while using Haven; the local server streams selected media to the browser and prepares MKV files for browser playback.

- **Manga:** open one or more CBZ books, import an entire folder of CBZ books through Haven’s folder browser, or choose a folder containing image pages. The vertical reader can be resized with width/height controls or by dragging its bottom-right corner; dimensions are remembered. Books and pages use natural numeric order. Standard stored/deflated CBZ files are supported; password-protected and ZIP64 archives are not.
- **Anime:** load a folder in Haven's browser folder picker. Videos in the folder and its subfolders appear in Haven's playlist and play in the browser. MKV and other unsupported containers convert on first playback to cached H.264/AAC MP4 files; embedded subtitles are extracted as WebVTT when FFmpeg supports the subtitle type. The verified FFmpeg Essentials build is stored in the user's local application-data folder and is not bundled in this project.
- **Bookshelf:** create, save, read, edit, search, and delete books. Writing is organized into book-style pages with a strict 1,200-character limit per page. Add or delete pages in the editor, then turn them with buttons or arrow keys while reading. Existing unpaged books are divided into pages automatically. Books are saved in localStorage; export JSON backups to preserve them.

Media stays on your device and must be selected again after refreshing. This version does not persist media access or reading/playback positions. Fonts and decorative artwork are local CSS, with no external asset requests.
