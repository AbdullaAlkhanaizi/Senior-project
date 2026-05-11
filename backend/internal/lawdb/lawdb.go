package lawdb

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"unicode"
)

const (
	defaultResultLimit = 4
	maxContextChars    = 9000
	maxExcerptChars    = 1200
	excerptLeadChars   = 180
)

type rawEntry struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	URL     string `json:"url"`
}

type Entry struct {
	Title       string
	Content     string
	URL         string
	searchTitle string
	searchBody  string
}

type KnowledgeBase struct {
	entries    []Entry
	sourcePath string
}

type scoredEntry struct {
	index  int
	score  int
	anchor string
}

func Load(path string) (*KnowledgeBase, error) {
	if strings.TrimSpace(path) == "" {
		return nil, errors.New("laws db path is empty")
	}

	resolvedPath, payload, err := readCandidateFile(path)
	if err != nil {
		return nil, err
	}

	var rawEntries []rawEntry
	if err := json.Unmarshal(payload, &rawEntries); err != nil {
		return nil, fmt.Errorf("decode laws db: %w", err)
	}

	entries := make([]Entry, 0, len(rawEntries))
	for _, item := range rawEntries {
		title := strings.TrimSpace(item.Title)
		content := compactWhitespace(item.Content)
		url := strings.TrimSpace(item.URL)
		if title == "" && content == "" {
			continue
		}

		entries = append(entries, Entry{
			Title:       title,
			Content:     content,
			URL:         url,
			searchTitle: strings.ToLower(title),
			searchBody:  strings.ToLower(content),
		})
	}

	if len(entries) == 0 {
		return nil, errors.New("laws db did not contain any usable entries")
	}

	return &KnowledgeBase{
		entries:    entries,
		sourcePath: resolvedPath,
	}, nil
}

func (k *KnowledgeBase) Len() int {
	if k == nil {
		return 0
	}
	return len(k.entries)
}

func (k *KnowledgeBase) SourcePath() string {
	if k == nil {
		return ""
	}
	return k.sourcePath
}

func (k *KnowledgeBase) RelevantContext(category string, prompts []string, limit int) string {
	if k == nil || len(k.entries) == 0 {
		return ""
	}
	if limit <= 0 {
		limit = defaultResultLimit
	}

	category = strings.TrimSpace(category)
	prompts = trimNonEmpty(prompts)
	tokens := collectTokens(category, prompts)
	fullQuery := strings.ToLower(strings.TrimSpace(strings.Join(prompts, " ")))
	categoryPhrase := strings.ToLower(category)

	results := make([]scoredEntry, 0, len(k.entries))
	for index, entry := range k.entries {
		score, anchor := scoreEntry(entry, categoryPhrase, fullQuery, tokens)
		if score <= 0 {
			continue
		}
		results = append(results, scoredEntry{
			index:  index,
			score:  score,
			anchor: anchor,
		})
	}

	if len(results) == 0 {
		return ""
	}

	sort.Slice(results, func(i, j int) bool {
		if results[i].score != results[j].score {
			return results[i].score > results[j].score
		}
		left := k.entries[results[i].index].Title
		right := k.entries[results[j].index].Title
		return strings.Compare(left, right) < 0
	})

	var builder strings.Builder
	builder.WriteString("Use these Bahrain law excerpts as the primary legal basis when answering. Cite the most relevant law title exactly as shown.\n")

	used := 0
	for _, result := range results {
		if used >= limit {
			break
		}

		entry := k.entries[result.index]
		excerpt := excerptAround(entry.Content, result.anchor)
		if excerpt == "" {
			continue
		}

		segment := fmt.Sprintf(
			"\nLaw %d\nTitle: %s\nURL: %s\nExcerpt: %s\n",
			used+1,
			defaultString(entry.Title, "Untitled law"),
			defaultString(entry.URL, "N/A"),
			excerpt,
		)
		if builder.Len()+len(segment) > maxContextChars && used > 0 {
			break
		}
		builder.WriteString(segment)
		used++
	}

	if used == 0 {
		return ""
	}

	return strings.TrimSpace(builder.String())
}

func readCandidateFile(path string) (string, []byte, error) {
	candidates := []string{filepath.Clean(strings.TrimSpace(path))}
	if !filepath.IsAbs(path) {
		candidates = append(candidates, filepath.Join("backend", path))
	}

	seen := make(map[string]struct{}, len(candidates))
	var readErr error
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if _, exists := seen[candidate]; exists {
			continue
		}
		seen[candidate] = struct{}{}

		payload, err := os.ReadFile(candidate)
		if err != nil {
			if readErr == nil {
				readErr = err
			}
			continue
		}

		resolvedPath, err := filepath.Abs(candidate)
		if err != nil {
			resolvedPath = candidate
		}
		return resolvedPath, payload, nil
	}

	if readErr == nil {
		readErr = os.ErrNotExist
	}
	return "", nil, fmt.Errorf("read laws db from %q: %w", path, readErr)
}

func scoreEntry(entry Entry, categoryPhrase, fullQuery string, tokens []string) (int, string) {
	score := 0
	anchor := ""

	if categoryPhrase != "" {
		if strings.Contains(entry.searchTitle, categoryPhrase) {
			score += 24
			anchor = chooseAnchor(anchor, categoryPhrase)
		}
		if strings.Contains(entry.searchBody, categoryPhrase) {
			score += 8
			anchor = chooseAnchor(anchor, categoryPhrase)
		}
	}

	if fullQuery != "" && len(fullQuery) <= 180 {
		if strings.Contains(entry.searchTitle, fullQuery) {
			score += 18
			anchor = chooseAnchor(anchor, fullQuery)
		}
		if strings.Contains(entry.searchBody, fullQuery) {
			score += 10
			anchor = chooseAnchor(anchor, fullQuery)
		}
	}

	for _, token := range tokens {
		if len(token) < 3 {
			continue
		}
		if strings.Contains(entry.searchTitle, token) {
			score += 10
			anchor = chooseAnchor(anchor, token)
		}
		if count := strings.Count(entry.searchBody, token); count > 0 {
			score += min(count, 3) * 3
			anchor = chooseAnchor(anchor, token)
		}
	}

	return score, anchor
}

func collectTokens(category string, prompts []string) []string {
	tokens := tokenize(category)
	tokens = append(tokens, categoryKeywords(category)...)
	for _, prompt := range prompts {
		tokens = append(tokens, tokenize(prompt)...)
	}

	seen := make(map[string]struct{}, len(tokens))
	unique := make([]string, 0, len(tokens))
	for _, token := range tokens {
		if token == "" || isStopWord(token) {
			continue
		}
		if _, exists := seen[token]; exists {
			continue
		}
		seen[token] = struct{}{}
		unique = append(unique, token)
		if len(unique) == 32 {
			break
		}
	}

	return unique
}

func tokenize(value string) []string {
	var builder strings.Builder
	builder.Grow(len(value))
	for _, r := range strings.ToLower(value) {
		switch {
		case unicode.IsLetter(r), unicode.IsDigit(r):
			builder.WriteRune(r)
		default:
			builder.WriteByte(' ')
		}
	}
	return strings.Fields(builder.String())
}

func categoryKeywords(category string) []string {
	switch strings.TrimSpace(category) {
	case "Traffic Law":
		return []string{"traffic", "road", "vehicle", "driving", "driver", "license", "accident"}
	case "Personal Status Law":
		return []string{"marriage", "divorce", "custody", "family", "alimony", "inheritance"}
	case "Civil & Commercial Law":
		return []string{"civil", "commercial", "commerce", "contract", "company", "debt", "trade"}
	case "Criminal Law":
		return []string{"criminal", "crime", "penalty", "offence", "offense", "prison", "fine"}
	case "Administrative Law":
		return []string{"administrative", "government", "ministry", "authority", "permit", "license"}
	case "Constitutional Law":
		return []string{"constitution", "constitutional", "rights", "assembly", "speech"}
	case "Sharia Law (Sunni or Jafari)":
		return []string{"sharia", "sunni", "jafari", "islamic", "inheritance", "marriage"}
	case "Military Law":
		return []string{"military", "armed", "service", "defense", "discipline"}
	case "Labor & Employment Law":
		return []string{"labor", "labour", "employment", "employee", "employer", "salary", "wages", "termination", "dismissal", "leave"}
	case "Property & Tenancy Law":
		return []string{"property", "tenancy", "tenant", "landlord", "lease", "rent", "eviction", "real", "estate"}
	default:
		return nil
	}
}

func compactWhitespace(value string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
}

func excerptAround(content, anchor string) string {
	content = compactWhitespace(content)
	if content == "" {
		return ""
	}
	if len(content) <= maxExcerptChars {
		return content
	}

	start := 0
	lowerContent := strings.ToLower(content)
	anchor = strings.ToLower(strings.TrimSpace(anchor))
	if anchor != "" {
		if index := strings.Index(lowerContent, anchor); index >= 0 {
			start = index - excerptLeadChars
			if start < 0 {
				start = 0
			}
		}
	}

	end := start + maxExcerptChars
	if end > len(content) {
		end = len(content)
	}

	for start > 0 && content[start-1] != ' ' {
		start--
	}
	for end < len(content) && content[end] != ' ' {
		end++
	}

	excerpt := strings.TrimSpace(content[start:end])
	if start > 0 {
		excerpt = "..." + excerpt
	}
	if end < len(content) {
		excerpt += "..."
	}
	return excerpt
}

func trimNonEmpty(values []string) []string {
	trimmed := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		trimmed = append(trimmed, value)
	}
	return trimmed
}

func chooseAnchor(current, candidate string) string {
	if current != "" {
		return current
	}
	return candidate
}

func isStopWord(token string) bool {
	switch token {
	case "about", "after", "also", "and", "are", "but", "can", "create", "for", "from", "have", "help", "here", "into", "law", "laws", "legal", "more", "need", "not", "question", "should", "tell", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "what", "when", "which", "with", "would", "your":
		return true
	default:
		return false
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
