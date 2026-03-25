#!/usr/bin/env python3
"""
批量转换PCM音频文件为WAV格式
用法: python pcm_to_wav.py <源目录> [--keep] [--dry-run]
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path


def convert_pcm_to_wav(pcm_path: Path, sample_rate: int = 16000, bit_depth: int = 16, channels: int = 1) -> Path:
    """使用ffmpeg将PCM转换为WAV"""
    wav_path = pcm_path.with_suffix('.wav')

    # ffmpeg命令: 输入PCM原始数据，指定格式参数，输出WAV
    cmd = [
        'ffmpeg', '-y',  # 覆盖已存在的文件
        '-f', f's{bit_depth}le',  # 16位小端PCM
        '-ar', str(sample_rate),  # 采样率
        '-ac', str(channels),  # 声道数
        '-i', str(pcm_path),  # 输入文件
        str(wav_path)  # 输出文件
    ]

    return wav_path, cmd


def main():
    parser = argparse.ArgumentParser(description='批量转换PCM为WAV (16kHz采样率)')
    parser.add_argument('source_dir', help='PCM文件所在目录')
    parser.add_argument('--keep', action='store_true', help='保留原PCM文件')
    parser.add_argument('--dry-run', action='store_true', help='只显示将要执行的转换，不实际执行')
    parser.add_argument('--sample-rate', type=int, default=16000, help='采样率 (默认: 16000)')
    parser.add_argument('--bit-depth', type=int, default=16, help='位深度 (默认: 16)')
    parser.add_argument('--channels', type=int, default=1, help='声道数 (默认: 1)')
    parser.add_argument('--delete-wav', action='store_true', help='删除已存在的WAV文件重新转换')

    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    if not source_dir.exists():
        print(f"错误: 目录不存在: {source_dir}")
        sys.exit(1)

    # 检查ffmpeg是否安装
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("错误: 需要安装ffmpeg")
        print("  macOS: brew install ffmpeg")
        print("  Ubuntu: sudo apt install ffmpeg")
        sys.exit(1)

    # 递归查找所有PCM文件
    pcm_files = list(source_dir.rglob('*.pcm'))
    pcm_files.extend(source_dir.rglob('*.PCM'))

    if not pcm_files:
        print(f"未找到PCM文件: {source_dir}")
        sys.exit(0)

    print(f"找到 {len(pcm_files)} 个PCM文件")
    print(f"参数: 采样率={args.sample_rate}Hz, 位深度={args.bit_depth}bit, 声道={args.channels}")
    print()

    converted = 0
    skipped = 0
    failed = 0

    for pcm_path in sorted(pcm_files):
        wav_path = pcm_path.with_suffix('.wav')

        # 如果WAV已存在且不需要重新转换
        if wav_path.exists() and not args.delete_wav:
            print(f"  跳过 (已存在): {wav_path.name}")
            skipped += 1
            continue

        wav_path, cmd = convert_pcm_to_wav(
            pcm_path,
            sample_rate=args.sample_rate,
            bit_depth=args.bit_depth,
            channels=args.channels
        )

        if args.dry_run:
            print(f"  [DRY-RUN] 将转换: {pcm_path.name} -> {wav_path.name}")
            converted += 1
            continue

        print(f"  转换: {pcm_path.name} -> {wav_path.name}", end=' ')

        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                print("✓")
                converted += 1

                # 删除原PCM文件
                if not args.keep:
                    pcm_path.unlink()
            else:
                print(f"✗ (ffmpeg错误)")
                print(f"    {result.stderr.strip()}")
                failed += 1
        except Exception as e:
            print(f"✗ ({e})")
            failed += 1

    print()
    print(f"完成: 转换 {converted}, 跳过 {skipped}, 失败 {failed}")

    if args.keep:
        print("原PCM文件已保留")
    elif converted > 0 and not args.dry_run:
        print("原PCM文件已删除")


if __name__ == '__main__':
    main()