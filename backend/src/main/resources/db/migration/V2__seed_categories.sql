INSERT INTO categories (name_category, description_category)
SELECT category.name, NULL
FROM (
         VALUES
             ('Развлечения'),
             ('Кино'),
             ('Образование'),
             ('Работа'),
             ('Музыка'),
             ('Покупки'),
             ('Другое')
     ) AS category(name)
WHERE NOT EXISTS (
    SELECT 1
    FROM categories existing
    WHERE existing.name_category = category.name
);
