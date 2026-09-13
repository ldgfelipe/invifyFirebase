content = open('C:/laragon/www/invifyFirebase/src/app/admin/page.tsx', 'r', encoding='utf-8').read()
replacements = {
    '📧': '[email]',
    '🆓': '[free]',
    '⭐': '[star]',
    '📈': '[chart]',
    '👥': '[users]',
    '🛡️': '[shield]',
    '💰': '[money]',
    '🎨': '[art]',
    '→': '->',
    '·': '.',
    'Ú': 'U',
    'á': 'a',
    'é': 'e',
    'í': 'i',
    'ó': 'o',
    'ú': 'u',
    'ñ': 'n',
}

for old, new in replacements.items(): content = content.replace(old, new)
content = content.replace('\u201c', '\
).replace(
\u201d, \')
content = content.replace('\u2018', \
\").replace(
\u2019, \"\)
content = content.replace('\u2013', '-').replace('\u2014', '-')
with open('C:/laragon/www/invifyFirebase/src/app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replaced non-ASCII characters')
