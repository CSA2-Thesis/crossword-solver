import os
import sys
from dictionary_helper import DictionaryHelper

class DictionarySearcher:
    def __init__(self, dictionary_path):
        self.dictionary = DictionaryHelper(dictionary_path)
        
    def display_results(self, results, title):
        print(f"\n{title}")
        print("-" * 80)
        if not results:
            print("No words found.")
            return
            
        for i, word_data in enumerate(results, 1):
            print(f"{i:2d}. {word_data['word']:15} | Score: {word_data['score']:3d} | Clue: {word_data['clue'][:60]}...")
    
    def search_by_clue(self):
        print("\n=== SEARCH BY CLUE ===")
        clue = input("Enter clue or keyword: ").strip()
        if not clue:
            print("No clue entered.")
            return
            
        # Ask for optional length range
        use_length = input("Filter by length? (y/n): ").lower().strip()
        length_range = None
        if use_length == 'y':
            try:
                min_len = int(input("Minimum length: "))
                max_len = int(input("Maximum length: "))
                length_range = (min_len, max_len)
            except ValueError:
                print("Invalid length input. Searching without length filter.")
        
        max_words = int(input("Maximum number of results (default 20): ") or "20")
        
        results = self.dictionary.get_possible_words(clue, max_words=max_words, length_range=length_range)
        self.display_results(results, f"Words matching clue '{clue}':")
    
    def search_by_pattern(self):
        print("\n=== SEARCH BY PATTERN ===")
        print("Use letters for known positions, '.' for unknown")
        print("Example: 'A..LE' for a 5-letter word starting with A and ending with LE")
        
        pattern = input("Enter pattern: ").strip().upper()
        if not pattern:
            print("No pattern entered.")
            return
            
        if not all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.' for c in pattern):
            print("Invalid pattern. Use only letters and dots.")
            return
            
        clue = input("Optional clue/keyword (press Enter to skip): ").strip()
        clue = clue if clue else None
        
        max_words = int(input("Maximum number of results (default 20): ") or "20")
        
        results = self.dictionary.get_words_by_pattern(pattern, clue=clue, max_words=max_words)
        self.display_results(results, f"Words matching pattern '{pattern}':")
    
    def search_by_length(self):
        print("\n=== SEARCH BY LENGTH ===")
        try:
            length = int(input("Enter word length: "))
            max_words = int(input("Maximum number of results (default 20): ") or "20")
            
            results = self.dictionary.get_words_by_length(length, max_words=max_words)
            self.display_results(results, f"Words with length {length}:")
            
        except ValueError:
            print("Invalid length input.")
    
    def search_by_first_letter(self):
        print("\n=== SEARCH BY FIRST LETTER ===")
        letter = input("Enter first letter: ").strip().upper()
        if not letter or len(letter) != 1 or not letter.isalpha():
            print("Invalid letter.")
            return
            
        max_words = int(input("Maximum number of results (default 20): ") or "20")
        
        results = self.dictionary.get_words_by_first_letter(letter, max_words=max_words)
        self.display_results(results, f"Words starting with '{letter}':")
    
    def get_word_info(self):
        print("\n=== GET WORD INFORMATION ===")
        word = input("Enter word: ").strip().upper()
        if not word:
            print("No word entered.")
            return
            
        word_data = self.dictionary.get_clue_for_word(word)
        print(f"\nWord: {word_data['word']}")
        print(f"Length: {len(word_data['word'])}")
        print(f"Score: {word_data['score']}")
        print(f"Clue: {word_data['clue']}")
        if 'definition' in word_data:
            print(f"Definition: {word_data['definition']}")
    
    def show_menu(self):
        print("\n" + "="*50)
        print("        DICTIONARY SEARCH TOOL")
        print("="*50)
        print("1. Search by clue or keyword")
        print("2. Search by pattern (e.g., 'A..LE')")
        print("3. Search by word length")
        print("4. Search by first letter")
        print("5. Get information for specific word")
        print("6. Get random word")
        print("7. Exit")
        print("-"*50)
    
    def run(self):
        print("Initializing dictionary...")
        print(f"Total words loaded: {len(self.dictionary.all_words)}")
        
        while True:
            self.show_menu()
            choice = input("\nEnter your choice (1-7): ").strip()
            
            if choice == '1':
                self.search_by_clue()
            elif choice == '2':
                self.search_by_pattern()
            elif choice == '3':
                self.search_by_length()
            elif choice == '4':
                self.search_by_first_letter()
            elif choice == '5':
                self.get_word_info()
            elif choice == '6':
                word_data = self.dictionary.get_random_word()
                if word_data:
                    print(f"\nRandom word: {word_data['word']}")
                    print(f"Clue: {word_data['clue']}")
                    print(f"Score: {word_data['score']}")
                else:
                    print("No words available.")
            elif choice == '7':
                print("Goodbye!")
                break
            else:
                print("Invalid choice. Please enter 1-7.")
            
            input("\nPress Enter to continue...")

def main():
    # Update this path to point to your dictionary directory
    dictionary_path = r"flask-backend\dictionary"
    
    # Alternative: use current directory if the above doesn't work
    if not os.path.exists(dictionary_path):
        dictionary_path = "dictionary"
        if not os.path.exists(dictionary_path):
            print(f"Dictionary path not found: {dictionary_path}")
            print("Please update the dictionary_path variable in the script.")
            return
    
    searcher = DictionarySearcher(dictionary_path)
    searcher.run()

if __name__ == "__main__":
    main()