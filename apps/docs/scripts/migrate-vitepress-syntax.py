#!/usr/bin/env python3
"""Convert VitePress-specific markdown syntax to fumadocs-compatible format."""
import os
import re
import sys

def convert_file(filepath: str) -> bool:
    """Convert a single file. Returns True if changes were made."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    lines = content.split('\n')
    result = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Handle ::: code-group - just remove the wrapper, keep code blocks
        if line.strip() == '::: code-group':
            i += 1  # skip the ::: code-group line
            continue
        
        # Handle ::: tip/warning/danger/info containers
        container_match = re.match(r'^::: (tip|warning|danger|info|note)\s*(.*)?$', line.strip())
        if container_match:
            container_type = container_match.group(1).upper()
            custom_title = container_match.group(2).strip() if container_match.group(2) else ''
            
            # Map VitePress types to GFM alert types
            type_map = {
                'TIP': 'TIP',
                'WARNING': 'WARNING',
                'DANGER': 'CAUTION',
                'INFO': 'NOTE',
                'NOTE': 'NOTE',
            }
            alert_type = type_map.get(container_type, 'NOTE')
            
            result.append(f'> [!{alert_type}]')
            if custom_title:
                result.append(f'> **{custom_title}**')
            
            i += 1
            # Collect content until closing :::
            while i < len(lines):
                if lines[i].strip() == ':::':
                    i += 1
                    break
                # Prefix content lines with '> '
                if lines[i].strip() == '':
                    result.append('>')
                else:
                    result.append(f'> {lines[i]}')
                i += 1
            result.append('')  # blank line after callout
            continue
        
        # Handle ::: details
        details_match = re.match(r'^::: details\s*(.*)?$', line.strip())
        if details_match:
            summary = details_match.group(1).strip() if details_match.group(1) else 'Details'
            result.append(f'<details>')
            result.append(f'<summary>{summary}</summary>')
            result.append('')
            i += 1
            while i < len(lines):
                if lines[i].strip() == ':::':
                    i += 1
                    break
                result.append(lines[i])
                i += 1
            result.append('')
            result.append('</details>')
            result.append('')
            continue
        
        # Handle standalone closing ::: (from code-group)
        if line.strip() == ':::':
            i += 1
            continue
        
        # Handle code fence tab labels: ```ts [pnpm] -> ```ts
        fence_match = re.match(r'^(```\w*)\s*\[.*\]\s*$', line)
        if fence_match:
            result.append(fence_match.group(1))
            i += 1
            continue
        
        result.append(line)
        i += 1
    
    new_content = '\n'.join(result)
    
    if new_content != original:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False

def main():
    content_dir = sys.argv[1] if len(sys.argv) > 1 else 'content/docs'
    changed = 0
    total = 0
    
    for root, dirs, files in os.walk(content_dir):
        for fname in files:
            if fname.endswith('.md') or fname.endswith('.mdx'):
                filepath = os.path.join(root, fname)
                total += 1
                if convert_file(filepath):
                    changed += 1
                    print(f'  converted: {filepath}')
    
    print(f'\nProcessed {total} files, converted {changed}')

if __name__ == '__main__':
    main()
