# NLP with Disaster Tweets

A UI for my entry to the Kaggle competition [Natural Language Processing with Disaster Tweets](https://www.kaggle.com/competitions/nlp-getting-started). For now it runs on a **pseudo model** (keyword weights), so the interface can be built before the real classifier.

## UI (`ui/`)

Minimal, pixel-style, white and grey.

1. Drop a `.csv` (Kaggle format: `id, keyword, location, text[, target]`) or a `.txt` (one tweet per line) onto the pixel folder, or click **Use sample tweets**.
2. The folder shakes while it processes, then opens. Three pages fly out, joined to it by dotted arrows:
   - **Real disaster** (p ≥ 0.65)
   - **Uncertain** (0.35 < p < 0.65)
   - **Not a disaster** (p ≤ 0.35)
3. Each page lists its tweets right away, with a probability meter. Words that pushed the score toward disaster are underlined. Words that pushed it away are struck through. If the file has a `target` column, each tweet shows ✓/✗ and an overall accuracy is shown.

### Run

```bash
python -m http.server 5173 --directory ui
```

Then open http://localhost:5173. You can also open `ui/index.html` directly.

### Plugging in the real model

The UI only calls `PseudoModel.predict(text)` in `ui/model.js`, which must return `{ prob, label, tokens: [{ text, weight }] }`. Swap the internals, for example to call a Python inference API, and keep that shape.
