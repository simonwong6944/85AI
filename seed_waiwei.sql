-- 活唯超吸安心墊試用問卷 Questions (campaign_id = 1)
-- Q1: 尿滲程度 (single_choice)
INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 1, 'single_choice', '您平日的尿滲程度屬於：', '', 1,
  '["輕微 — 偶爾少量滲漏，如咳嗽、打噴嚏或運動時","中度 — 間中出現較明顯尿滲","較嚴重 — 經常出現較大量尿滲"]',
  1, 3);

-- Q2: 之前品牌 (text)
INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 2, 'text', '試用本產品前，您主要使用哪個品牌的失禁護墊？', '（如過往沒有使用失禁護墊，請填寫「沒有」）', 1, '[]', 0, 0);

-- Q3: 試用尺寸 (single_choice)
INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 3, 'single_choice', '今次試用的尺寸：', '', 1, '["240mm","280mm"]', 1, 2);

-- Q4a-Q4h: 8 項評分 (rating, 1-5)
INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 4, 'rating', '評分：吸收速度', '1分=非常不滿意 ｜ 2分=不滿意 ｜ 3分=一般 ｜ 4分=滿意 ｜ 5分=非常滿意', 1, '[]', 1, 5);

INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 5, 'rating', '評分：乾爽程度', '1分=非常不滿意 ｜ 2分=不滿意 ｜ 3分=一般 ｜ 4分=滿意 ｜ 5分=非常滿意', 1, '[]', 1, 5);

INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 6, 'rating', '評分：防漏效果', '1分=非常不滿意 ｜ 2分=不滿意 ｜ 3分=一般 ｜ 4分=滿意 ｜ 5分=非常滿意', 1, '[]', 1, 5);

INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 7, 'rating', '評分：舒適度／柔軟度', '1分=非常不滿意 ｜ 2分=不滿意 ｜ 3分=一般 ｜ 4分=滿意 ｜ 5分=非常滿意', 1, '[]', 1, 5);

INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 8, 'rating', '評分：貼身程度', '1分=非常不滿意 ｜ 2分=不滿意 ｜ 3分=一般 ｜ 4分=滿意 ｜ 5分=非常滿意', 1, '[]', 1, 5);

INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 9, 'rating', '評分：透氣度／不焗促程度', '1分=非常不滿意 ｜ 2分=不滿意 ｜ 3分=一般 ｜ 4分=滿意 ｜ 5分=非常滿意', 1, '[]', 1, 5);

INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 10, 'rating', '評分：異味控制', '1分=非常不滿意 ｜ 2分=不滿意 ｜ 3分=一般 ｜ 4分=滿意 ｜ 5分=非常滿意', 1, '[]', 1, 5);

INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 11, 'rating', '評分：整體滿意度', '1分=非常不滿意 ｜ 2分=不滿意 ｜ 3分=一般 ｜ 4分=滿意 ｜ 5分=非常滿意', 1, '[]', 1, 5);

-- Q5: 與之前品牌比較 (single_choice)
INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 12, 'single_choice', '與您之前使用的品牌相比，今次試用產品整體表現：', '', 1,
  '["明顯較好","較好","差不多","較差","明顯較差","無法比較"]',
  1, 6);

-- Q6: 是否考慮購買 (single_choice)
INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 13, 'single_choice', '您會否考慮日後購買本產品？', '', 1,
  '["一定會","可能會","未決定","可能不會","不會"]',
  1, 5);

-- Q7: 其他意見 (text, optional)
INSERT INTO testing_questions (campaign_id, question_order, question_type, title, description, is_required, options, min_value, max_value)
VALUES (1, 14, 'text', '對產品有沒有其他意見或改善建議？', '', 0, '[]', 0, 0);
