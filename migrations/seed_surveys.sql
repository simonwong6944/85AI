-- 兩隻海天產品(如已存在同名產品請勿重複,可先查再決定)
INSERT INTO products (name_zh, name_en, price, category, cost)
VALUES ('海天金標生抽', 'Haday Golden Label Light Soy Sauce', 0, '調味', 0);
INSERT INTO products (name_zh, name_en, price, category, cost)
VALUES ('海天蠔油', 'Haday Oyster Sauce', 0, '調味', 0);

-- 問卷 1:生抽(綁上面第一件產品)
INSERT INTO surveys (title_zh, product_id, vendor, status)
VALUES ('海天金標生抽 體驗問卷',
        (SELECT id FROM products WHERE name_zh='海天金標生抽' ORDER BY id DESC LIMIT 1),
        '海天', 'OPEN');

-- 問卷 2:蠔油
INSERT INTO surveys (title_zh, product_id, vendor, status)
VALUES ('海天蠔油 體驗問卷',
        (SELECT id FROM products WHERE name_zh='海天蠔油' ORDER BY id DESC LIMIT 1),
        '海天', 'OPEN');

-- 為兩份問卷各插入 7 條相同題目
-- 生抽問卷題目
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 1, 'single', '您用咗呢隻產品幾耐?', '["1-3日","4-7日","成個試用期"]', 1 FROM surveys s WHERE s.title_zh='海天金標生抽 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 2, 'rating', '整體滿意度(1至5星)', NULL, 1 FROM surveys s WHERE s.title_zh='海天金標生抽 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 3, 'single', '同您依家用開嘅同類產品比較?', '["好好多","好少少","差唔多","差啲","差好多"]', 1 FROM surveys s WHERE s.title_zh='海天金標生抽 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 4, 'multi', '您最鍾意邊方面?(可揀多過一個)', '["效果","價錢","氣味/味道","使用方便","包裝","其他"]', 1 FROM surveys s WHERE s.title_zh='海天金標生抽 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 5, 'single', '您會唔會考慮自己買?', '["一定會","可能會","未決定","唔會"]', 1 FROM surveys s WHERE s.title_zh='海天金標生抽 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 6, 'single', '您覺得幾多錢一件可以接受?', '["$15-20","$21-28","$29-35","$36-40","$40以上"]', 1 FROM surveys s WHERE s.title_zh='海天金標生抽 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 7, 'text', '有咩想同我哋講?(可以唔填)', NULL, 0 FROM surveys s WHERE s.title_zh='海天金標生抽 體驗問卷';

-- 蠔油問卷題目(同上 7 條)
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 1, 'single', '您用咗呢隻產品幾耐?', '["1-3日","4-7日","成個試用期"]', 1 FROM surveys s WHERE s.title_zh='海天蠔油 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 2, 'rating', '整體滿意度(1至5星)', NULL, 1 FROM surveys s WHERE s.title_zh='海天蠔油 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 3, 'single', '同您依家用開嘅同類產品比較?', '["好好多","好少少","差唔多","差啲","差好多"]', 1 FROM surveys s WHERE s.title_zh='海天蠔油 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 4, 'multi', '您最鍾意邊方面?(可揀多過一個)', '["效果","價錢","氣味/味道","使用方便","包裝","其他"]', 1 FROM surveys s WHERE s.title_zh='海天蠔油 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 5, 'single', '您會唔會考慮自己買?', '["一定會","可能會","未決定","唔會"]', 1 FROM surveys s WHERE s.title_zh='海天蠔油 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 6, 'single', '您覺得幾多錢一件可以接受?', '["$15-20","$21-28","$29-35","$36-40","$40以上"]', 1 FROM surveys s WHERE s.title_zh='海天蠔油 體驗問卷';
INSERT INTO survey_questions (survey_id, seq, qtype, text_zh, options_json, required)
SELECT s.id, 7, 'text', '有咩想同我哋講?(可以唔填)', NULL, 0 FROM surveys s WHERE s.title_zh='海天蠔油 體驗問卷';
