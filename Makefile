PORT := 8000
URL := http://localhost:$(PORT)
OUTPUT := slides.pdf

.PHONY: start export

install:
	npm install

## Start the dev server with live reload
start:
	node serve.js

## Export slides to PDF (requires the dev server to be running)
export:
	@echo "Exporting slides to $(OUTPUT)..."
	@echo "Make sure the dev server is running (make start) in another terminal."
	npx decktape reveal "$(URL)" "$(OUTPUT)"
	@echo "Done → $(OUTPUT)"
