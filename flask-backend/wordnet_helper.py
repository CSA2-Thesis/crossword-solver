from nltk.corpus import wordnet as wn

def get_possible_words(clue):
    words = set()
    for synset in wn.synsets(clue):
        for lemma in synset.lemmas():
            words.add(lemma.name().replace("_", " "))
    return list(words)
