# Anime app status

The anime app now loads folder-selected videos into Haven's browser playlist. MKV and other unsupported containers are converted locally to cached H.264/AAC MP4 for native browser playback; embedded subtitles are extracted to WebVTT when FFmpeg supports their format. The browser player supports byte-range seeking, natural episode ordering, auto-next, playback speed, and full-series looping.

The browser playback path was exercised with a generated two-episode MKV series containing an embedded subtitle. Both episodes appeared in the Haven playlist, played in the browser, showed the extracted subtitle, and looped from the finale back to the first episode.
