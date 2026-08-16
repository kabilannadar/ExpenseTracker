import os
import json
import sys

# Define directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCALES_DIR = os.path.join(BASE_DIR, "frontend", "src", "locales")
EN_FILE = os.path.join(LOCALES_DIR, "en.json")

# Mapping of target language files to IndicTrans2 target language codes
LANG_MAPPING = {
    "hi": "hin_Deva",
    "ta": "tam_Taml",
    "te": "tel_Telu",
    "kn": "kan_Knda",
    "ml": "mal_Mlym",
    "mr": "mar_Deva",
    "gu": "guj_Gujr",
    "bn": "ben_Beng"
}

def load_en_locales():
    with open(EN_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_translated_locales(lang, translated_data):
    out_file = os.path.join(LOCALES_DIR, f"{lang}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(translated_data, f, ensure_ascii=False, indent=2)
    print(f"Saved {lang}.json")

# Flatten nested JSON dictionary for batch translation
def flatten_dict(d, parent_key='', sep='__JSON_SEP__'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

# Reconstruct nested JSON from flattened dict
def unflatten_dict(d, sep='__JSON_SEP__'):
    result = {}
    for key, value in d.items():
        parts = key.split(sep)
        curr = result
        for part in parts[:-1]:
            curr = curr.setdefault(part, {})
        curr[parts[-1]] = value
    return result

def main():
    if not os.path.exists(EN_FILE):
        print(f"Error: Base English locales file not found at {EN_FILE}")
        sys.exit(1)

    print("Loading English locales...")
    en_data = load_en_locales()
    flat_en = flatten_dict(en_data)
    keys = list(flat_en.keys())
    sentences = list(flat_en.values())

    print(f"Found {len(sentences)} strings to translate.")

    # Try to import torch and transformers for IndicTrans2 local inference
    try:
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        model_name = "ai4bharat/indictrans2-en-indic-1B"
        print(f"Loading tokenizer and model '{model_name}' with device_map='auto'...")
        
        tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        model = AutoModelForSeq2SeqLM.from_pretrained(
            model_name,
            trust_remote_code=True,
            device_map="auto"
        )
        
        for lang_code, target_lang in LANG_MAPPING.items():
            print(f"Translating to {lang_code} ({target_lang}) locally using Hugging Face model...")
            
            # Format inputs manually for IndicTrans2 (source prefix and target prefix)
            batch = [f"<eng_Latn> <{target_lang}> {sent}" for sent in sentences]
            inputs = tokenizer(batch, padding="longest", return_tensors="pt").to(model.device)
            
            with torch.no_grad():
                generated_tokens = model.generate(
                    **inputs,
                    use_cache=True,
                    min_length=0,
                    max_length=256,
                    num_beams=5,
                    num_return_sequences=1
                )
                
            with tokenizer.as_target_tokenizer():
                decoded_preds = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)
                
            final_translations = [pred.strip() for pred in decoded_preds]
            
            # Create the translated dictionary
            translated_flat = {k: v for k, v in zip(keys, final_translations)}
            translated_data = unflatten_dict(translated_flat)
            save_translated_locales(lang_code, translated_data)

    except Exception as e:
        print(f"\nIndicTrans2 local inference failed or torch/transformers are missing: {e}")
        print("Falling back to a lightweight translation API to generate the JSON files so you can test i18n instantly...")
        try:
            from mtranslate import translate
        except ImportError:
            print("Installing mtranslate helper...")
            os.system("pip install mtranslate")
            from mtranslate import translate

        import time
        import random

        # Translate API codes
        API_CODES = {
            "hi": "hi", "ta": "ta", "te": "te", "kn": "kn", "ml": "ml", "mr": "mr", "gu": "gu", "bn": "bn"
        }

        for lang_code, api_lang in API_CODES.items():
            print(f"Translating to {lang_code} using fallback API...")
            
            # Load existing translations to reuse them and prevent rate limits
            existing_data = {}
            out_file = os.path.join(LOCALES_DIR, f"{lang_code}.json")
            if os.path.exists(out_file):
                try:
                    with open(out_file, "r", encoding="utf-8") as f:
                        existing_data = json.load(f)
                except Exception as ex:
                    print(f"  Warning loading existing {lang_code}.json: {ex}")
            
            flat_existing = flatten_dict(existing_data)
            translated_flat = {}

            for k, text in flat_en.items():
                # Reuse if already translated and is not identical to English (or if it's nav key / header key that matches but is verified)
                if k in flat_existing and flat_existing[k] and flat_existing[k] != text:
                    translated_flat[k] = flat_existing[k]
                else:
                    # Translate with retry and backoff
                    translated_text = text
                    retries = 3
                    for attempt in range(retries):
                        try:
                            time.sleep(0.3 + random.random() * 0.1) # Sleep to avoid rate limits
                            res = translate(text, api_lang, "en")
                            if res:
                                translated_text = res
                                break
                        except Exception as tx:
                            print(f"  Error translating '{text}' to {lang_code} (attempt {attempt+1}/{retries}): {tx}")
                            time.sleep(1.5 * (attempt + 1))
                    
                    translated_flat[k] = translated_text
            
            translated_data = unflatten_dict(translated_flat)
            save_translated_locales(lang_code, translated_data)

    print("\nTranslation complete! Locales generated successfully.")

if __name__ == "__main__":
    main()
