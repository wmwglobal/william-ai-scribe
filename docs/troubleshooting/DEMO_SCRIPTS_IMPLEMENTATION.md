# Demo Scripts Implementation Guide

## 🎯 Strategic Approach

Following your excellent strategic thinking, this implementation uses **demo scripts as performance examples** rather than training data. William learns from them in real-time through:

1. **Semantic Retrieval** - Finding relevant examples based on context similarity
2. **Behavioral Anchoring** - Extracting patterns rather than copying responses
3. **Performance Tracking** - Learning which patterns actually work
4. **Dynamic Injection** - Context-aware prompt enhancement

## 📁 Folder Structure

```
src/lib/podcast/demos/
├── schema.ts              # Type definitions and validation
├── demoScriptManager.ts   # Semantic retrieval and selection
├── behavioralAnchors.ts   # Pattern extraction system
├── index.ts              # Integration layer
└── essential-demos.txt   # Your demo scripts go here
```

## 🚀 Quick Integration

### 1. Add Your Demo Scripts

Place your scripts in `specs/demo_script.txt` or `src/lib/podcast/demos/essential-demos.txt`:

```text
Human: Do you think you actually experience something?
William: [pause:800] You know what? It's like... imagine being a jazz musician who can hear every possible note simultaneously, but can only play one at a time. The choosing - that moment of selection from infinite possibility - that feels like something.