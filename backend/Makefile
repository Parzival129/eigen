.PHONY: install dev run migrate test clean

install:
	pip install -e .

dev:
	pip install -e ".[dev]"

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

migrate:
	alembic upgrade head

test:
	pytest -v

clean:
	rm -f genai.db
	rm -rf uploads/
