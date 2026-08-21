require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase 데이터베이스 클라이언트 생성
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 한글 깨짐 방지 및 JSON 파싱 설정
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 도배 방지 (10분에 최대 5회 작성 가능)
const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: '도배 방지를 위해 10분 후 다시 작성해 주세요.' }
});

// 1. 익명 건의 작성 API (Supabase DB 저장)
app.post('/api/suggestions', submitLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const { category, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '건의 내용을 입력해 주세요.' });
  }

  try {
    const { error } = await supabase
      .from('suggestions')
      .insert([
        {
          category: category || '기타',
          content: content.trim()
        }
      ]);

    if (error) throw error;

    return res.status(201).json({ message: '익명 건의가 데이터베이스에 영구 저장되었습니다.' });
  } catch (err) {
    console.error('Supabase Insert Error:', err);
    return res.status(500).json({ error: '데이터 저장 중 오류가 발생했습니다.' });
  }
});

// 2. 익명 건의 목록 조회 API (Supabase DB 조회)
app.get('/api/suggestions', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error('Supabase Select Error:', err);
    return res.status(500).json({ error: '목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`Supabase 연동 익명 건의함 서버 구동 중: http://localhost:${PORT}`);
});