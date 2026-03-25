"""
修复 sentence_index 不连续的问题
在 Etest 目录下运行: python fix_sentence_index.py
"""
import sys
sys.path.insert(0, '.')

from backend.models import Sentence, LanguagePair
from backend.database import SessionLocal

db = SessionLocal()

try:
    # 获取所有语言对
    language_pairs = db.query(LanguagePair).all()

    print("开始修复 sentence_index...")
    print("=" * 50)

    for lp in language_pairs:
        # 获取该语言对的所有句子，按当前 sentence_index 排序
        sentences = db.query(Sentence).filter(
            Sentence.language_pair_id == lp.id
        ).order_by(Sentence.sentence_index).all()

        if not sentences:
            continue

        # 检查是否需要修复
        indices = [s.sentence_index for s in sentences]
        expected = list(range(1, len(sentences) + 1))

        if indices != expected:
            # 重新编号
            for i, s in enumerate(sentences, 1):
                old_idx = s.sentence_index
                s.sentence_index = i
            print(f"✓ {lp.pair_code}: {indices[:5]}... → 重新排序为 1~{len(sentences)}")
        else:
            print(f"  {lp.pair_code}: 已是连续的 1~{len(sentences)}，无需修复")

    db.commit()
    print("\n修复完成！")

except Exception as e:
    db.rollback()
    print(f"错误: {e}")
    raise

finally:
    db.close()