# Contributing to Project Almanac

## Code Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run tests: `pytest` (backend), `npm test` (frontend)
5. Submit a pull request

## Content Contributions

The most impactful contribution is **adding verified knowledge content**. We need:

- Food preservation techniques with proper citations
- Gardening guides (region-specific is especially valuable)
- Solar/renewable energy sizing and installation
- Water systems (well, rainwater, purification)
- Construction techniques for off-grid buildings
- Animal husbandry best practices

### Content Format

Create JSONL files where each line is:

```json
{
  "chunk_id": "unique_identifier",
  "text": "The actual content. Should be 100-500 words, self-contained, and practical.",
  "source": "Name of the source publication",
  "section": "Section or chapter title",
  "safety_tier": "guarded"
}
```

### Content Requirements

- **Source everything.** Every chunk must cite its source.
- **Use public domain or CC-licensed content.** Government publications (USDA, FEMA, CDC, military field manuals) are public domain. Check license before including other content.
- **Be practical.** Focus on actionable how-to information, not theory.
- **Keep chunks self-contained.** A chunk should make sense on its own without needing the surrounding context.
- **Don't split procedures.** Step-by-step instructions should stay in one chunk.

## License

By contributing, you agree that your contributions will be licensed under AGPL-3.0.
