FROM python:3.11-bullseye

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# ---- System dependencies for PDF parsing, OCR, images ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-srp \
    tesseract-ocr-srp-latn \
    tesseract-ocr-hrv \
    poppler-utils \
    libfreetype6 \
    libjpeg62-turbo \
    libopenjp2-7 \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python","-m","uvicorn","app.main:app","--host","0.0.0.0","--port","5000","--proxy-headers","--forwarded-allow-ips","*"]