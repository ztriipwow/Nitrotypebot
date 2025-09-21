# klavia_autotyper.py
import time
import random
import sys
from pynput.keyboard import Controller, Key
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# ---- SETTINGS ----
WPM = 65
ACCURACY = 97            # percent chance to be correct
DELAY_BEFORE_START = 8   # seconds to wait after detecting race text
RELOAD_DELAY = 2         # seconds to wait after finishing, before reload
URL = "https://klavia.io/race"
TEXT_SPAN_SELECTOR = "span.typing-letter"  # grabs letters (including spaces if rendered)
HIGHLIGHTED_SELECTOR = "span.typing-letter.highlight-letter"  # used to detect start

# ---- SETUP ----
keyboard = Controller()
delay_per_char = 60.0 / (WPM * 5.0)  # average 5 chars per word

# Setup selenium + chromedriver auto-download
options = webdriver.ChromeOptions()
# optional: run chrome visibly (this is required because we will send real keystrokes)
options.add_argument("--start-maximized")
# avoid headless — keystrokes to headless don't make sense
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)

def focus_game_window():
    # try to bring the selenium window to front and click body to focus the page
    try:
        driver.maximize_window()
    except Exception:
        pass
    try:
        body = driver.find_element(By.TAG_NAME, "body")
        body.click()  # focus element so keyboard input goes there
    except Exception:
        pass
    # small pause to ensure focus
    time.sleep(0.3)

def get_race_text_snapshot():
    # read all span.typing-letter currently present and build text
    elems = driver.find_elements(By.CSS_SELECTOR, TEXT_SPAN_SELECTOR)
    return "".join([e.text if e.text != "" else " " for e in elems])

def wait_for_race():
    # Wait until highlighted letter exists
    print("Waiting for race to appear...")
    while True:
        try:
            highlighted = driver.find_elements(By.CSS_SELECTOR, HIGHLIGHTED_SELECTOR)
            if highlighted:
                return
        except Exception:
            pass
        time.sleep(0.5)

def type_char_real(char):
    # send real keystrokes (space handled by Key.space)
    if char == " ":
        keyboard.press(Key.space); keyboard.release(Key.space)
    else:
        # for characters that are upper-case or symbols, sending char directly usually works
        keyboard.press(char)
        keyboard.release(char)

def type_text_with_mistakes(text):
    for ch in text:
        # random decision to mistype: if random>ACCURACY => make mistake
        if random.randint(1, 100) > ACCURACY:
            # pick a random lowercase wrong letter (avoid sending space as wrong)
            wrong = random.choice("abcdefghijklmnopqrstuvwxyz")
            keyboard.press(wrong); keyboard.release(wrong)
            time.sleep(delay_per_char / 2.0)

            # backspace to erase wrong
            keyboard.press(Key.backspace); keyboard.release(Key.backspace)
            time.sleep(delay_per_char / 2.0)

        # now type correct character (use space key if needed)
        if ch == " ":
            keyboard.press(Key.space); keyboard.release(Key.space)
        else:
            keyboard.press(ch); keyboard.release(ch)

        time.sleep(delay_per_char)

def run_one_race():
    # Wait for race presence
    wait_for_race()

    # Optional: grab text snapshot (may be used for debugging)
    race_snapshot = get_race_text_snapshot()
    print("Race text snapshot (first pass):", repr(race_snapshot[:200]))

    # Bring window to front & click to ensure focus
    focus_game_window()

    # Wait requested delay then begin typing
    print(f"Detected race; waiting {DELAY_BEFORE_START}s before typing...")
    time.sleep(DELAY_BEFORE_START)

    # Now type live — instead of using the snapshot, type by reading the highlighted char repeatedly.
    # This handles dynamic games which update DOM as you type.
    while True:
        highlighted = driver.find_elements(By.CSS_SELECTOR, HIGHLIGHTED_SELECTOR)
        if not highlighted:
            # no highlighted letter => check if any typing-letter exists (maybe finished)
            remaining = driver.find_elements(By.CSS_SELECTOR, TEXT_SPAN_SELECTOR)
            # if none remain (or not highlighted), assume race finished
            if not remaining:
                break
            # else try again next loop
            time.sleep(0.01)
            continue

        ch = highlighted[0].text if highlighted[0].text != "" else " "
        # do the mistake+correct flow inline (so we don't re-query and skip)
        if random.randint(1, 100) > ACCURACY:
            wrong = random.choice("abcdefghijklmnopqrstuvwxyz")
            # send wrong
            if wrong == " ":
                keyboard.press(Key.space); keyboard.release(Key.space)
            else:
                keyboard.press(wrong); keyboard.release(wrong)
            # short wait
            time.sleep(delay_per_char / 2.0)
            # backspace wrong
            keyboard.press(Key.backspace); keyboard.release(Key.backspace)
            time.sleep(delay_per_char / 6.0)  # tiny gap before correct
            # send correct char
            if ch == " ":
                keyboard.press(Key.space); keyboard.release(Key.space)
            else:
                keyboard.press(ch); keyboard.release(ch)
        else:
            # correct on first try
            if ch == " ":
                keyboard.press(Key.space); keyboard.release(Key.space)
            else:
                keyboard.press(ch); keyboard.release(ch)

        time.sleep(delay_per_char)

    print("Finished race typing. Waiting", RELOAD_DELAY, "seconds before reload...")
    time.sleep(RELOAD_DELAY)
    driver.refresh()
    # short delay to allow reload
    time.sleep(1.0)

# main loop
print("Opening URL:", URL)
driver.get(URL)
try:
    while True:
        run_one_race()
except KeyboardInterrupt:
    print("Interrupted by user, exiting...")
finally:
    try:
        driver.quit()
    except Exception:
        pass
    sys.exit(0)
