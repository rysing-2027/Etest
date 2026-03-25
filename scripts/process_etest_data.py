#!/usr/bin/env python3
"""
Etest数据处理脚本：
1. 从result文件夹提取json文件生成excel对比表
2. 将pcm音频文件复制到uploads对应文件夹

用法: python scripts/process_etest_data.py
"""

import json
import os
import shutil
from pathlib import Path
import pandas as pd

# 路径配置
PROJECT_DIR = Path(__file__).parent.parent
DATA_DIR = PROJECT_DIR / "data"
RESULT_DIR = DATA_DIR / "result"
UPLOADS_DIR = DATA_DIR / "uploads"

def task1_generate_excel():
    """任务1: 从result文件夹提取json文件生成excel对比表"""
    print("=" * 60)
    print("任务1: 生成Excel对比表")
    print("=" * 60)

    # 存储所有数据
    all_data = []

    # 遍历self和xzy两个引擎
    for engine in ["self", "xzy"]:
        engine_dir = RESULT_DIR / engine

        if not engine_dir.exists():
            print(f"警告: {engine_dir} 不存在，跳过")
            continue

        # 遍历所有语言对文件夹
        for lang_pair_dir in engine_dir.iterdir():
            if not lang_pair_dir.is_dir():
                continue

            lang_pair = lang_pair_dir.name
            json_file = lang_pair_dir / "result.json"

            if not json_file.exists():
                print(f"警告: {json_file} 不存在，跳过")
                continue

            # 读取json文件
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 判断是引擎1还是引擎2
            if engine == "self":
                engine_mt_key = "引擎1翻译文本"
                engine_asr_key = "引擎1识别文本"
            else:  # xzy
                engine_mt_key = "引擎2翻译文本"
                engine_asr_key = "引擎2识别文本"

            for item in data:
                # 构建记录
                record = {
                    "语料ID": item.get("id", "").replace(".wav", ""),  # 去除.wav后缀
                    "源语言": item.get("original", ""),
                    "目标语言": item.get("target", ""),
                }

                # 根据引擎设置对应的翻译和识别文本
                if engine == "self":
                    record["引擎1翻译文本"] = item.get("mt", "")
                    record["引擎1识别文本"] = item.get("asr", "")
                    record["引擎2翻译文本"] = ""
                    record["引擎2识别文本"] = ""
                else:  # xzy
                    record["引擎1翻译文本"] = ""
                    record["引擎1识别文本"] = ""
                    record["引擎2翻译文本"] = item.get("mt", "")
                    record["引擎2识别文本"] = item.get("asr", "")

                # 查找或创建已有记录
                existing_record = None
                for r in all_data:
                    if r["语料ID"] == record["语料ID"]:
                        existing_record = r
                        break

                if existing_record:
                    # 更新现有记录
                    existing_record["引擎1翻译文本"] = record["引擎1翻译文本"] or existing_record.get("引擎1翻译文本", "")
                    existing_record["引擎1识别文本"] = record["引擎1识别文本"] or existing_record.get("引擎1识别文本", "")
                    existing_record["引擎2翻译文本"] = record["引擎2翻译文本"] or existing_record.get("引擎2翻译文本", "")
                    existing_record["引擎2识别文本"] = record["引擎2识别文本"] or existing_record.get("引擎2识别文本", "")
                else:
                    all_data.append(record)

    # 创建DataFrame并保存为Excel
    df = pd.DataFrame(all_data)

    # 按照语料ID排序
    df = df.sort_values("语料ID")

    # 定义列顺序
    columns = ["语料ID", "源语言", "目标语言", "引擎1翻译文本", "引擎1识别文本", "引擎2翻译文本", "引擎2识别文本"]
    df = df[columns]

    # 保存Excel
    output_file = DATA_DIR / "translation_comparison.xlsx"
    df.to_excel(output_file, index=False, engine='openpyxl')

    print(f"Excel文件已生成: {output_file}")
    print(f"共处理 {len(df)} 条记录")
    print()

def task2_copy_audio_files():
    """任务2: 将result文件夹中的pcm音频文件复制到uploads对应文件夹"""
    print("=" * 60)
    print("任务2: 复制音频文件到uploads文件夹")
    print("=" * 60)

    # 统计复制情况
    total_copied = 0

    # 遍历self和xzy两个引擎
    for engine in ["self", "xzy"]:
        engine_dir = RESULT_DIR / engine

        if not engine_dir.exists():
            print(f"警告: {engine_dir} 不存在，跳过")
            continue

        # 确定目标文件夹：self -> engine1, xzy -> engine2
        engine_folder = "engine1" if engine == "self" else "engine2"

        # 遍历所有语言对文件夹
        for lang_pair_dir in engine_dir.iterdir():
            if not lang_pair_dir.is_dir():
                continue

            lang_pair = lang_pair_dir.name
            target_dir = UPLOADS_DIR / lang_pair / engine_folder

            # 确保目标目录存在
            target_dir.mkdir(parents=True, exist_ok=True)

            # 查找所有pcm文件
            pcm_files = list(lang_pair_dir.glob("*.pcm"))

            if pcm_files:
                print(f"处理 {engine}/{lang_pair}: 找到 {len(pcm_files)} 个pcm文件")

            for pcm_file in pcm_files:
                target_file = target_dir / pcm_file.name

                # 如果目标文件已存在，先删除
                if target_file.exists():
                    target_file.unlink()

                # 复制文件
                shutil.copy2(pcm_file, target_file)
                total_copied += 1

    print(f"\n共复制 {total_copied} 个音频文件")
    print()

if __name__ == "__main__":
    # 先删除已存在的Excel（如果被占用则跳过）
    try:
        if DATA_DIR / "translation_comparison.xlsx":
            os.remove(DATA_DIR / "translation_comparison.xlsx")
    except:
        pass

    try:
        task1_generate_excel()
    except Exception as e:
        print(f"任务1跳过: {e}")

    task2_copy_audio_files()
    print("所有任务完成!")