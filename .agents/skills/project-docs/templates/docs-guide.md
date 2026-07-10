# Documentation Guide

## Purpose

These docs explain the **intent, behavior, and architecture** of
{service} so operators and engineers can reason about it without reading
source.

## Audience

- **Operators** who need to run, monitor, or troubleshoot the service.
- **Engineers** extending {service} behavior.

## Voice & Style

- Be concise, direct, and task-focused.
- Describe **why** and **how the system behaves**, not line-by-line
  implementation.
- Prefer bullet points and short paragraphs.

## Content Principles

- **Intent first**: open with when/why a reader should open the doc.
- **Behavior over code**: avoid duplicating code or function names
  unless needed to anchor concepts.
- **Explicit boundaries**: note what the service does _not_ do.
- **Failure modes**: call out important error paths and operational
  implications.

## Structure

- Use an H1 title that matches the file name.
- Start with a short **Intent** section.
- Include topic-appropriate sections (Key behaviors, Interfaces,
  Endpoints, etc.) where relevant.
- End with a **Related docs** section linking to related topic docs.
- Use **Mermaid** diagrams for architecture or flow explanations.

## Linking

- Cross-link related docs instead of repeating details.

## Safety & Privacy

- Do **not** include real secrets or example values.
- Never include absolute file paths.
