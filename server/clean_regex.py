import zipfile
import os
import re
import glob

def clean_xml_regex(xml_text):
    # Remove highlighting
    xml_text = re.sub(r'<w:highlight[^>]*/>', '', xml_text)
    
    # Remove underline
    xml_text = re.sub(r'<w:u [^>]*/>', '', xml_text)
    
    # Remove shading
    xml_text = re.sub(r'<w:shd [^>]*/>', '', xml_text)
    
    # Remove Notes paragraphs (Nota:, NOTA:, nota:)
    # Paragraphs are <w:p ...> ... </w:p>
    # We use non-greedy matching and DOTALL to handle multiple lines
    paragraphs = re.findall(r'<w:p\b.*?</w:p>', xml_text, flags=re.DOTALL)
    for p in paragraphs:
        # Extract plain text from paragraph
        p_text = re.sub(r'<[^>]+>', '', p)
        if any(keyword in p_text for keyword in ['Nota:', 'NOTA:', 'nota:', 'IMPORTANTE:']):
            xml_text = xml_text.replace(p, '')
            
    return xml_text

for f in glob.glob('/home/ubuntu/serambienteai/server/templates/reports/*.docx'):
    if f.endswith('.backup') or f.endswith('.pybak'): continue
    
    backup_path = f + '.backup'
    if not os.path.exists(backup_path): 
        print(f'Skipping {f} (no backup)')
        continue
        
    print(f'Cleaning formatting and notes in {f}')
    
    with zipfile.ZipFile(backup_path, 'r') as zin, zipfile.ZipFile(f, 'w') as zout:
        for item in zin.infolist():
            content = zin.read(item.filename)
            if item.filename.endswith('.xml'):
                try:
                    text = content.decode('utf-8', errors='ignore')
                    cleaned = clean_xml_regex(text)
                    content = cleaned.encode('utf-8')
                except Exception as e:
                    print(f'  Error in {item.filename}: {e}')
            zout.writestr(item, content)

print('Done cleaning.')
