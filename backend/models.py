import random
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum as SAEnum, Table
)
from sqlalchemy.orm import relationship
from database import Base

# 测试人员可测语言对：多对多关联表
tester_language_pairs = Table(
    "tester_language_pairs",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("language_pair_id", Integer, ForeignKey("language_pairs.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    test_sessions = relationship("TestSession", back_populates="user", cascade="all, delete-orphan")
    # 测试人员可测语言对（仅非管理员）：空表示不限制=全部可测
    allowed_language_pairs = relationship(
        "LanguagePair",
        secondary=tester_language_pairs,
        backref="allowed_testers",
        lazy="selectin",
    )


class LanguagePair(Base):
    __tablename__ = "language_pairs"

    id = Column(Integer, primary_key=True, index=True)
    source_lang = Column(String(20), nullable=False)
    target_lang = Column(String(20), nullable=False)
    pair_code = Column(String(10), unique=True, nullable=False)  # e.g. "zh-en"
    display_name = Column(String(50), nullable=False)  # e.g. "中文 → 英语"
    created_at = Column(DateTime, default=datetime.utcnow)

    sentences = relationship("Sentence", back_populates="language_pair", cascade="all, delete-orphan")
    test_sessions = relationship("TestSession", back_populates="language_pair", cascade="all, delete-orphan")


class Sentence(Base):
    __tablename__ = "sentences"

    id = Column(Integer, primary_key=True, index=True)
    language_pair_id = Column(Integer, ForeignKey("language_pairs.id"), nullable=False)
    sentence_index = Column(Integer, nullable=False)  # auto-assigned, internal ordering
    sid = Column(String(100), nullable=False)  # user-defined unique ID per language pair

    source_text = Column(Text, nullable=False)
    source_audio_path = Column(String(500))
    source_audio_duration = Column(Float, default=0)

    engine1_translation_text = Column(Text, default="")
    engine1_recognition_text = Column(Text, default="")
    engine1_audio_path = Column(String(500))

    engine2_translation_text = Column(Text, default="")
    engine2_recognition_text = Column(Text, default="")
    engine2_audio_path = Column(String(500))

    created_at = Column(DateTime, default=datetime.utcnow)

    language_pair = relationship("LanguagePair", back_populates="sentences")
    ratings = relationship("SentenceRating", back_populates="sentence", cascade="all, delete-orphan")


class TestSession(Base):
    __tablename__ = "test_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    language_pair_id = Column(Integer, ForeignKey("language_pairs.id"), nullable=False)
    status = Column(String(20), default="in_progress")  # in_progress / completed / voided
    current_index = Column(Integer, default=1)
    randomization_seed = Column(Integer, default=lambda: random.randint(0, 2**31))
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="test_sessions")
    language_pair = relationship("LanguagePair", back_populates="test_sessions")
    ratings = relationship("SentenceRating", back_populates="test_session", cascade="all, delete-orphan")


class SentenceRating(Base):
    __tablename__ = "sentence_ratings"

    id = Column(Integer, primary_key=True, index=True)
    test_session_id = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    sentence_id = Column(Integer, ForeignKey("sentences.id"), nullable=False)
    sentence_index = Column(Integer, nullable=False)

    engine_left = Column(String(20), nullable=False)   # "self_research" or "iflytek"
    engine_right = Column(String(20), nullable=False)

    left_play_count = Column(Integer, default=0)
    right_play_count = Column(Integer, default=0)
    user_rating = Column(Integer, nullable=True)  # -2, -1, 0, 1, 2

    duration_seconds = Column(Float, default=0)
    rated_at = Column(DateTime, nullable=True)

    test_session = relationship("TestSession", back_populates="ratings")
    sentence = relationship("Sentence", back_populates="ratings")
