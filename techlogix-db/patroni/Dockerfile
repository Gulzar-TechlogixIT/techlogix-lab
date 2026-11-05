FROM postgres:16-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 \
       python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/patroni \
    && /opt/patroni/bin/pip install --no-cache-dir \
       "patroni[etcd3]==4.0.6" \
       "psycopg2-binary>=2.9,<3" \
       PyYAML

ENV PATH="/opt/patroni/bin:${PATH}"

COPY patroni.yml.template /etc/patroni.yml.template
COPY render-patroni-config.py /usr/local/bin/render-patroni-config.py

ENTRYPOINT ["python3", "/usr/local/bin/render-patroni-config.py"]