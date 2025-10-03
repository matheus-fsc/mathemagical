#!/usr/bin/env python3
"""
Script para extrair frames de GIFs e converter em sprites PNG individuais.
Isso resolve o problema de animação no canvas HTML5.

Requisitos: pip install pillow

Uso: python extract_gif_frames.py
"""

import os
from PIL import Image
import json

def extract_gif_frames(gif_path, output_dir, sprite_name):
    """
    Extrai todos os frames de um GIF e salva como PNGs individuais.
    
    Args:
        gif_path: Caminho para o arquivo GIF
        output_dir: Diretório de saída para os frames
        sprite_name: Nome base para os sprites
    
    Returns:
        Dict com informações dos frames extraídos
    """
    try:
        # Abre o GIF
        with Image.open(gif_path) as gif:
            print(f"Processando: {gif_path}")
            print(f"Dimensões: {gif.size}")
            print(f"Número de frames: {gif.n_frames}")
            print(f"Duração: {gif.info.get('duration', 100)}ms por frame")
            
            # Cria diretório de saída se não existir
            os.makedirs(output_dir, exist_ok=True)
            
            frames_info = {
                "name": sprite_name,
                "width": gif.size[0],
                "height": gif.size[1],
                "frame_count": gif.n_frames,
                "frame_duration": gif.info.get('duration', 100),
                "frames": []
            }
            
            # Extrai cada frame
            for frame_num in range(gif.n_frames):
                gif.seek(frame_num)
                
                # Converte para RGBA para preservar transparência
                frame = gif.convert('RGBA')
                
                # Nome do arquivo do frame
                frame_filename = f"{sprite_name}_frame_{frame_num:03d}.png"
                frame_path = os.path.join(output_dir, frame_filename)
                
                # Salva o frame
                frame.save(frame_path, 'PNG')
                
                frames_info["frames"].append({
                    "filename": frame_filename,
                    "frame_number": frame_num,
                    "duration": gif.info.get('duration', 100)
                })
                
                print(f"  Frame {frame_num + 1}/{gif.n_frames} salvo: {frame_filename}")
            
            return frames_info
            
    except Exception as e:
        print(f"Erro ao processar {gif_path}: {e}")
        return None

def main():
    """Função principal que processa todos os GIFs."""
    
    # Estrutura de diretórios
    base_dir = "."
    sprites_dir = os.path.join(base_dir, "sprites")
    frames_dir = os.path.join(base_dir, "sprite_frames")
    
    # GIFs para processar
    gifs_to_process = [
        # GIFs de caminhada
        {
            "path": os.path.join(sprites_dir, "walk", "Link (Back).gif"),
            "name": "link_walk_back",
            "output_dir": os.path.join(frames_dir, "walk")
        },
        {
            "path": os.path.join(sprites_dir, "walk", "Link (Front)1.gif"),
            "name": "link_walk_front",
            "output_dir": os.path.join(frames_dir, "walk")
        },
        {
            "path": os.path.join(sprites_dir, "walk", "Link (Left)1.gif"),
            "name": "link_walk_left",
            "output_dir": os.path.join(frames_dir, "walk")
        },
        
        # GIFs de ataque
        {
            "path": os.path.join(sprites_dir, "attackSword", "Link (Normal) (Back) - Wooden Sword.gif"),
            "name": "link_attack_back",
            "output_dir": os.path.join(frames_dir, "attack")
        },
        {
            "path": os.path.join(sprites_dir, "attackSword", "Link (Normal) (Front) - Wooden Sword1.gif"),
            "name": "link_attack_front",
            "output_dir": os.path.join(frames_dir, "attack")
        },
        {
            "path": os.path.join(sprites_dir, "attackSword", "Link (Normal) (Left) - Wooden Sword1.gif"),
            "name": "link_attack_left",
            "output_dir": os.path.join(frames_dir, "attack")
        }
    ]
    
    # Dicionário para armazenar informações de todos os sprites
    all_sprites_info = {
        "sprites": {},
        "total_gifs_processed": 0,
        "total_frames_extracted": 0
    }
    
    print("=== EXTRATOR DE FRAMES DE GIF ===")
    print(f"Processando {len(gifs_to_process)} GIFs...")
    print()
    
    # Processa cada GIF
    for gif_info in gifs_to_process:
        gif_path = gif_info["path"]
        sprite_name = gif_info["name"]
        output_dir = gif_info["output_dir"]
        
        if os.path.exists(gif_path):
            frames_info = extract_gif_frames(gif_path, output_dir, sprite_name)
            
            if frames_info:
                all_sprites_info["sprites"][sprite_name] = frames_info
                all_sprites_info["total_gifs_processed"] += 1
                all_sprites_info["total_frames_extracted"] += frames_info["frame_count"]
                print(f"✅ {sprite_name}: {frames_info['frame_count']} frames extraídos")
            else:
                print(f"❌ Falha ao processar {sprite_name}")
        else:
            print(f"⚠️  Arquivo não encontrado: {gif_path}")
        
        print()
    
    # Salva informações em JSON
    json_path = os.path.join(frames_dir, "sprites_info.json")
    os.makedirs(frames_dir, exist_ok=True)
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_sprites_info, f, indent=2, ensure_ascii=False)
    
    print("=== RESUMO ===")
    print(f"GIFs processados: {all_sprites_info['total_gifs_processed']}")
    print(f"Total de frames extraídos: {all_sprites_info['total_frames_extracted']}")
    print(f"Informações salvas em: {json_path}")
    print()
    print("Próximos passos:")
    print("1. Execute este script: python extract_gif_frames.py")
    print("2. Os frames PNG serão salvos em sprite_frames/")
    print("3. Use os sprites PNG no jogo ao invés dos GIFs")
    print()
    print("Estrutura de saída:")
    print("sprite_frames/")
    print("├── walk/")
    print("│   ├── link_walk_back_frame_000.png")
    print("│   ├── link_walk_back_frame_001.png")
    print("│   └── ...")
    print("├── attack/")
    print("│   ├── link_attack_front_frame_000.png")
    print("│   └── ...")
    print("└── sprites_info.json")

if __name__ == "__main__":
    # Verifica se o Pillow está instalado
    try:
        from PIL import Image
        main()
    except ImportError:
        print("❌ Erro: PIL (Pillow) não está instalado")
        print("Execute: pip install pillow")
        print("Depois execute novamente este script")