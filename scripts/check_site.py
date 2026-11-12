"""Validate the static BAKR routes, approved catalogue and recovered content."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'assets/catalog.json').read_text())
expected=['fortnite','call-of-duty','fivem','arc-raiders','fc-27','overwatch-2','dead-by-daylight','marvel-rivals','rust','apex-legends','hwid-spoofer']
assert [g['slug'] for g in data['games']]==expected
ids={g['id'] for g in data['guides']}
for game in data['games']:
 assert (ROOT/'games'/game['slug']/'index.html').exists()
 assert set(game['guides'])<=ids
for guide in data['guides']:
 assert guide['game'] in expected
 assert (ROOT/guide['route'].strip('/')/'index.html').exists()
 assert guide['sections']
 assert len({s['id'] for s in guide['sections']})==len(guide['sections'])
 for section in guide['sections']:
  body=section['html']
  assert not re.search(r'<(?:iframe|script)|\son\w+=|javascript:',body,re.I)
  for src in re.findall(r'src="([^"]+)"',body):
   if src.startswith('/'):assert (ROOT/src.lstrip('/')).exists(),src
for route in ['fortnite','ancientfix','Arcane']:
 assert 'iframe' not in (ROOT/'solutions'/route/'index.html').read_text()
print(f"PASS: {len(expected)} approved games, {len(data['guides'])} guide routes, {sum(len(g['sections']) for g in data['guides'])} content sections; local media and embed checks passed.")
for game in data['games']:
 assert game.get('image'),game['slug']
 if game['image'].startswith('/'): assert (ROOT/game['image'].lstrip('/')).exists()
for page in [ROOT/'index.html',ROOT/'requirements/index.html',*ROOT.glob('games/*/index.html'),*ROOT.glob('solutions/*/index.html')]:
 assert 'id="language"' in page.read_text(),page
assert 'sjaZaUnlO94' in (ROOT/'assets/app.js').read_text()
print('PASS: all 11 game images and language controls on all documentation pages')
