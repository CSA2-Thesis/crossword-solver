from nltk.corpus import wordnet as wn
from typing import List, Dict
import nltk
from collections import defaultdict
import re

LETTER_SCORES = {
    'E': 13, 'T': 12, 'A': 11, 'O': 10, 'I': 9, 'N': 8,
    'S': 7, 'H': 6, 'R': 5, 'D': 4, 'L': 3, 'C': 2,
    'U': 1, 'M': 1, 'W': 1, 'F': 1, 'G': 1, 'Y': 1,
    'P': 1, 'B': 1, 'V': 1, 'K': 1, 'J': 1, 'X': 1,
    'Q': 1, 'Z': 1
}

BLACKLIST_WORDS = {
    'a', 'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'he', 
    'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
    'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were',
    'be', 'being', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can',
    'could', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'as', 'at',
    'by', 'in', 'of', 'on', 'to', 'with', 'from', 'into', 'about', 'over'
}

def get_possible_words(clue="", max_words=100, length_range=(3, 12)) -> List[Dict]:
    words = []
    try:
        if not clue:
            length_to_words = defaultdict(list)

            for synset in wn.all_synsets():
                definition = synset.definition()
                is_likely_vocab_word = len(definition.split()) > 3 and not any(w in definition for w in ['used', 'form', 'relating', 'pertaining'])

                for lemma in synset.lemmas():
                    word = lemma.name().replace("_", " ").lower()
                    if _is_valid_word(word, length_range) and not _is_blacklisted(word.upper()):
                        freq = lemma.count()
                        score = _word_score(word)
                        if is_likely_vocab_word:
                            score += 2
                        length_to_words[len(word)].append({
                            'word': word.upper(),
                            'definition': definition[:200],
                            'frequency': freq,
                            'word_score': score
                        })

            collected_words = []
            for length in sorted(length_to_words.keys()):
                len_words = length_to_words[length]
                
                len_words.sort(key=lambda w: (-(w['frequency'] * 0.5 + w['word_score'] * 5.0)))
                
                num_to_take = max(1, max_words // (len(length_to_words) + 1)) 
                collected_words.extend(len_words[:num_to_take])

            if len(collected_words) < max_words:
                 for length in sorted(length_to_words.keys()):
                     len_words = length_to_words[length]
                     start_index = max(1, max_words // (len(length_to_words) + 1))
                     collected_words.extend(len_words[start_index:start_index + 5]) 
                     if len(collected_words) >= max_words:
                         break

            collected_words.sort(key=lambda w: (-(w['frequency'] * 0.5 + w['word_score'] * 5.0)))
            
            seen = {}
            final_words = []
            for word_dict in collected_words:
                word_str = word_dict['word']
                score = word_dict['frequency'] * 0.5 + word_dict['word_score'] * 5.0
                if word_str not in seen or score > seen[word_str]:
                    seen[word_str] = score
                    final_words.append({
                        'word': word_str,
                        'definition': word_dict['definition'],
                        'frequency': word_dict['frequency']
                    })
            
            return final_words[:max_words]

        else:
            potential_matches = []

            synsets_direct = wn.synsets(clue)
            
            if not synsets_direct:
                try:
                    from nltk.stem import WordNetLemmatizer
                    lemmatizer = WordNetLemmatizer()
                    base_form = lemmatizer.lemmatize(clue)
                    if base_form != clue:
                        synsets_direct = wn.synsets(base_form)
                except Exception as e:
                    print(f"Lemmatization error for clue '{clue}': {e}")
            try:
                import nltk
                from nltk.corpus import stopwords
                stop_words = set(stopwords.words('english'))
            except:
                 stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them"}

            normalized_clue = re.sub(r'[^\w\s]', '', clue.lower())
            clue_words = [w for w in normalized_clue.split() if w not in stop_words and len(w) > 1]
            
            keyword_synsets = []
            for word in clue_words:
                keyword_synsets.extend(wn.synsets(word))
                try:
                    from nltk.stem import WordNetLemmatizer
                    lemmatizer = WordNetLemmatizer()
                    base_word = lemmatizer.lemmatize(word)
                    if base_word != word:
                        keyword_synsets.extend(wn.synsets(base_word))
                except: pass

            all_synsets_to_check = list(set(synsets_direct + keyword_synsets))

            for synset in all_synsets_to_check:
                related_synsets = [synset] + synset.hypernyms() + synset.hyponyms()
                for related_synset in related_synsets:
                    definition = related_synset.definition()
                    for lemma in related_synset.lemmas():
                        word_candidate = lemma.name().replace("_", " ").lower()
                        if _is_valid_word(word_candidate, length_range) and not _is_blacklisted(word_candidate.upper()):
                            freq = lemma.count()
                            score = _word_score(word_candidate)
                            
                            if synset in synsets_direct:
                                score += 20
                            elif related_synset in synsets_direct:
                                 score += 15
                            elif synset in keyword_synsets:
                                score += 10

                            potential_matches.append({
                                'word': word_candidate.upper(),
                                'definition': definition[:200],
                                'frequency': freq,
                                'relevance_score': score,   
                                'source_synset': related_synset.name()[:50] 
                            })

            potential_matches.sort(key=lambda x: -x['relevance_score'])

            seen_words = {}
            results = []
            for match in potential_matches:
                word = match['word']
                score = match['relevance_score']
                if word not in seen_words or score > seen_words[word]['relevance_score']:
                    seen_words[word] = match

            results = list(seen_words.values())[:max_words * 2]

            if len(results) < max_words // 2:
                 fallback_words = []
                 length_to_words = defaultdict(list)
                 for synset in wn.all_synsets():
                     definition = synset.definition().lower()
                     clue_word_overlap_bonus = sum(1 for cw in clue_words if cw in definition)
                     
                     for lemma in synset.lemmas():
                         word = lemma.name().replace("_", " ").lower()
                         if _is_valid_word(word, length_range) and not _is_blacklisted(word.upper()):
                             freq = lemma.count()
                             score = _word_score(word) + clue_word_overlap_bonus
                             length_to_words[len(word)].append({
                                 'word': word.upper(),
                                 'definition': synset.definition()[:200],
                                 'frequency': freq,
                                 'word_score': score
                             })
                 
                 for length in range(length_range[0], length_range[1] + 1):
                     if length in length_to_words:
                         sorted_len_words = sorted(length_to_words[length], key=lambda w: (-(w['frequency'] * 0.5 + w['word_score'] * 5.0)))
                         fallback_words.extend(sorted_len_words[:20])
                         if len(fallback_words) >= max_words:
                             break
                 
                 results.extend(fallback_words)

            results.sort(key=lambda x: -x['relevance_score'] if 'relevance_score' in x else -(x.get('frequency', 0) * 0.5 + x.get('word_score', 0) * 5.0))

            final_seen = {}
            final_results = []
            for item in results:
                 word = item['word']
                 score = item.get('relevance_score', item.get('frequency', 0) * 0.5 + item.get('word_score', 0) * 5.0)
                 if word not in final_seen or score > final_seen[word]:
                     final_seen[word] = score
                     final_results.append({
                         'word': word,
                         'definition': item['definition'],
                         'frequency': item['frequency']
                     })

            final_results.sort(key=lambda w: (-final_seen[w['word']])) 
            return final_results[:max_words]

    except Exception as e:
        print(f"Error in get_possible_words(clue='{clue}', max_words={max_words}, length_range={length_range}): {e}")
        fallback_list = [
            {'word': 'AGILE', 'definition': 'moving quickly and lightly', 'frequency': 10},
            {'word': 'APT', 'definition': 'at risk of or subject to experiencing something usually unpleasant', 'frequency': 10},
            {'word': 'IRA', 'definition': 'Irish Republican Army or Individual Retirement Account', 'frequency': 10},
            {'word': 'REAL', 'definition': 'actually existing as a thing or occurring in fact', 'frequency': 10},
            {'word': 'ACTIVE', 'definition': 'engaged in or ready for action', 'frequency': 10},
            {'word': 'EASY', 'definition': 'posing no difficulty', 'frequency': 10},
            {'word': 'WAN', 'definition': '(of light) lacking in intensity or brightness', 'frequency': 10},
            {'word': 'ABLE', 'definition': 'having the necessary means or skill', 'frequency': 10},
            {'word': 'PYTHON', 'definition': 'a large snake or programming language', 'frequency': 10},
            {'word': 'JAVA', 'definition': 'coffee or programming language', 'frequency': 10},
            {'word': 'RUBY', 'definition': 'precious stone', 'frequency': 10},
            {'word': 'CODE', 'definition': 'system of rules or computer instructions', 'frequency': 10},
            {'word': 'LOOP', 'definition': 'repeating sequence', 'frequency': 10},
            {'word': 'GRID', 'definition': 'a pattern of regularly spaced horizontal and vertical lines', 'frequency': 10},
            {'word': 'CLUE', 'definition': 'a hint or indication', 'frequency': 10},
        ]
        filtered_fallback = [w for w in fallback_list if length_range[0] <= len(w['word']) <= length_range[1]]
        if clue:
            normalized_clue = re.sub(r'[^\w\s]', '', clue.lower())
            clue_words_set = set(normalized_clue.split())
            def overlap_score(word_dict):
                def_words = set(re.sub(r'[^\w\s]', '', word_dict['definition'].lower()).split())
                return len(clue_words_set.intersection(def_words))
            
            filtered_fallback.sort(key=lambda w: -overlap_score(w))

        return filtered_fallback[:max_words]

    return []

def _is_valid_word(word: str, length_range=(3, 12)) -> bool:
    min_len, max_len = length_range
    return (word.isalpha() and 
            min_len <= len(word) <= max_len and 
            "_" not in word and
            word == word.lower() and
            not any(char.isdigit() for char in word) and
            not word.endswith('s'))

def _word_score(word: str) -> int:
    return sum(LETTER_SCORES.get(c.upper(), 0) for c in word)

def get_clue_for_word(word: str) -> Dict[str, str]:

    if not word:
        return {"word": "", "clue": ""}
    
    word_lower = word.lower()
    possible_definitions = []
    
    try:
        for synset in wn.synsets(word_lower):
            lemma = max(synset.lemmas(), key=lambda l: l.count(), default=None)
            if lemma:
                possible_definitions.append({
                    'definition': synset.definition(),
                    'frequency': lemma.count()
                })
        
        if possible_definitions:
            best_definition = max(possible_definitions, key=lambda d: d['frequency'])
            return {
                "word": word.upper(),
                "clue": best_definition['definition'][:200]
            }
    
    except Exception as e:
        print(f"Error getting clue for {word}: {str(e)}")
    
    return {
        "word": word.upper(),
        "clue": f"Definition related to {word.lower()}"
    }

def get_words_by_length(length: int, max_words: int = 50) -> List[Dict]:

    words = []
    seen_words = set()
    
    for synset in wn.all_synsets():
        for lemma in synset.lemmas():
            word = lemma.name().replace('_', ' ').lower()
            if (len(word) == length and 
                word not in seen_words and
                _is_good_crossword_word(word)):
                
                seen_words.add(word)
                words.append({
                    'word': word.upper(),
                    'definition': _clean_definition(synset.definition()),
                    'score': _calculate_word_score(word),
                    'frequency': lemma.count()
                })
                
                if len(words) >= max_words * 2:
                    break
        if len(words) >= max_words * 2:
            break

    words = [w for w in words if not _is_blacklisted(w['word'])]
    words.sort(key=lambda w: (-w['score'], -w['frequency']))
    
    return words[:max_words]

def _is_good_crossword_word(word: str) -> bool:
    """Check if a word is suitable for crossword puzzles"""
    return (word.isalpha() and 
            word == word.lower() and
            '_' not in word and
            not word.endswith('s') and
            len(word) >= 3 and
            not any(char.isdigit() for char in word) and
            word not in BLACKLIST_WORDS and
            not any(ord(c) > 127 for c in word)) 

def _calculate_word_score(word: str) -> int:
    score = sum(LETTER_SCORES.get(c.upper(), 0) for c in word)
    
    common_letters = {'E', 'A', 'R', 'I', 'O', 'T', 'N', 'S', 'L', 'C'}
    unique_letters = set(word.upper())
    score += len(unique_letters & common_letters) * 2
    
    obscure_letters = {'Q', 'Z', 'X', 'J', 'K', 'V'}
    score -= len(unique_letters & obscure_letters) * 2
    
    return max(1, score)

def _clean_definition(definition: str) -> str:
    """Clean up WordNet definitions for use as clues"""
    definition = re.sub(r'\([^)]*\)', '', definition)
    definition = re.sub(r'\s+', ' ', definition).strip()
    definition = definition[0].upper() + definition[1:]
    if not definition.endswith(('.', '!', '?')):
        definition += '.'
    return definition

def _clean_example(example: str) -> str:
    """Clean up example sentences"""
    example = re.sub(r'["“”]', '', example)
    example = example[0].upper() + example[1:]
    if not example.endswith(('.', '!', '?')):
        example += '.'
    return example

def _get_related_adjective(synset) -> str:
    """Get related adjective for adverb synsets"""
    for lemma in synset.lemmas():
        for derived in lemma.derivationally_related_forms():
            if derived.synset().pos() == 'a': 
                return derived.name().replace('_', ' ')
    return "something"

def _is_blacklisted(word: str) -> bool:
    """Check if word should be excluded"""
    word_lower = word.lower()
    return (word_lower in BLACKLIST_WORDS or
            any(offensive in word_lower for offensive in ['slur', 'derog', 'offensive']) or
            re.search(r'(ing|ed|s)$', word_lower)) 

def verify_solution(solution_word: str, expected_word: str) -> bool:
    """Check if words match directly or as synonyms using WordNet"""
    if not solution_word or not expected_word:
        return False
    
    if solution_word.upper() == expected_word.upper():
        return True
    
    try:
        solution_synsets = wn.synsets(solution_word.lower())
        expected_synsets = wn.synsets(expected_word.lower())
        return any(syn in expected_synsets for syn in solution_synsets)
    except:
        return False