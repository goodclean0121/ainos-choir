# Score conversion server: MuseScore 3 (MuseScore/MIDI → MusicXML) + Audiveris (PDF/image → MusicXML, experimental).
FROM ubuntu:24.04

ARG AUDIVERIS_VERSION=5.6.2
ARG AUDIVERIS_DEB=Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-x86_64.deb

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates curl nodejs musescore3 tesseract-ocr \
 && curl -fsSL -o /tmp/audiveris.deb \
      "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/${AUDIVERIS_DEB}" \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends /tmp/audiveris.deb \
 && rm -rf /tmp/audiveris.deb /var/lib/apt/lists/*

ENV MSCORE_BIN=mscore3 \
    AUDIVERIS_BIN=/opt/audiveris/bin/Audiveris \
    QT_QPA_PLATFORM=offscreen \
    PORT=8787

WORKDIR /app
COPY convert.mjs server.mjs ./
EXPOSE 8787
USER nobody
CMD ["node", "server.mjs"]
