
-- 2. Limpiar tablas
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM product_categories;
DELETE FROM products;
DELETE FROM categories;

-- 3. Crear categorías
INSERT INTO categories (name) VALUES ('snacks'), ('bebidas'), ('helados'), ('cafe');

-- 4. Insertar productos SNACKS (con category = 'snacks')
INSERT INTO products (barcode, name, price, cost, stock_quantity, is_active, category) VALUES
('7591206000381', 'CHEESE TRIS 150G', 2, 1.42, 10, true, 'snacks'),
('7591206003252', 'DORITO MEGA QUESO 150G', 3, 2.24, 10, true, 'snacks'),
('7591206002521', 'DORITOS MEGA QUESO 45GR', 1, 0.78, 10, true, 'snacks'),
('7591206285269', 'PEPITO 80GR', 1.3, 0.97, 10, true, 'snacks'),
('7591206285252', 'PEPITO 25GR', 0.75, 0.5, 10, true, 'snacks'),
('7591206000770', 'CHICHARRON JACKS PICANTE 20GR', 1.1, 0.8, 10, true, 'snacks'),
('7591016873434', 'SAMBA FRESA 32GR', 1, 0.77, 10, true, 'snacks'),
('7591016854976', 'GALAK CHOC BLANCO 30GR', 1.5, 1.05, 10, true, 'snacks'),
('7591016854686', 'RIKITI 30GR', 1.5, 1.05, 10, true, 'snacks'),
('7591016851135', 'SAVOY CHOCOLATE CON LECHE 30GR', 1.5, 1.05, 10, true, 'snacks'),
('7591016851555', 'CRI CRI 27GR', 1.5, 1.05, 10, true, 'snacks'),
('TORONTO00879', 'TORONTO CHOCOLATE 324GR', 1, 0.73, 10, true, 'snacks'),
('7591016871089', 'COCOSETTE MAXI 50GR', 1.1, 0.84, 10, true, 'snacks'),
('7591016871065', 'SUSY MAXI 50GR', 1, 0.77, 10, true, 'snacks'),
('78939394', 'GALAK TUBITO 16GR', 0.6, 0.39, 10, true, 'snacks'),
('7591206285429', 'RAQUETY PICANTE 36GR', 1, 0.67, 10, true, 'snacks'),
('7591206285603', 'DORITO DINAMITA LIMON TAQUERO 40G', 1, 0.78, 10, true, 'snacks'),
('7591206285504', 'DE TODITO PLUS 110GR', 2.5, 1.88, 10, true, 'snacks'),
('7591206003924', 'CHEESE TRIS 50GR', 0.85, 0.64, 10, true, 'snacks');

-- 5. Insertar productos BEBIDAS
INSERT INTO products (barcode, name, price, cost, stock_quantity, is_active, category) VALUES
('75930578', 'YUKERY BOTELLA NARANJADA', 1.2, 0.87, 10, true, 'bebidas'),
('75920944', 'YUKERY BOTELLA PERA', 1.2, 0.87, 10, true, 'bebidas'),
('75918729', 'MALTA BOTELLA NO RETORNABLE', 1, 0.65, 10, true, 'bebidas'),
('7591031011330', 'TE LIPTON ICE TEA LIMON', 2.2, 1.64, 10, true, 'bebidas'),
('7591031003250', 'PEPSI 1.5L', 1.3, 1, 10, true, 'bebidas'),
('7591031003229', 'PEPSI LATA 355ML', 1.2, 0.91, 10, true, 'bebidas'),
('7591031003526', '7UP LATA 355ML', 1.2, 0.91, 10, true, 'bebidas'),
('7591446002480', 'MALTA LATA 250ML', 1, 0.73, 10, true, 'bebidas'),
('7591127501868', 'JUGO NARANJA DEL VALLE 500ML', 1, 0.7, 10, true, 'bebidas'),
('7591031003359', 'GOLDEN KOLITA 1.5L', 1.5, 1.08, 10, true, 'bebidas'),
('7591031000020', 'GOLDEN UVA 1.5L', 1.5, 1.08, 10, true, 'bebidas'),
('7591031000037', 'GOLDEN MANZANA 1.5L', 1.5, 1.08, 10, true, 'bebidas'),
('7591031000013', 'GOLDEN PIÑA 1.5L', 1.5, 1.08, 10, true, 'bebidas'),
('7591031003588', '7UP 1.5L', 1.5, 1.08, 10, true, 'bebidas'),
('7591127343574', 'NEVADA MANZANA AGUA GASIFICADA 1.5L', 1.6, 1.2, 10, true, 'bebidas'),
('7592396005316', 'JUGO JUCOSA MANZANA 200CM', 0.8, 0.6, 10, true, 'bebidas'),
('7592396005293', 'JUGO JUCOSA PERA 200CM', 0.8, 0.6, 10, true, 'bebidas'),
('7592396005279', 'JUGO JUCOSA DURAZNO 200CM', 0.8, 0.6, 10, true, 'bebidas'),
('7702090071849', 'SPEED MAX LATA 310ML', 1, 0.78, 10, true, 'bebidas'),
('7591127251862', 'POWERADE MANDARINA 500ML', 2, 1.55, 10, true, 'bebidas'),
('7591127221865', 'POWERADE MORA AZUL 500ML', 2, 1.55, 10, true, 'bebidas'),
('7702192736455', 'GATORADE BLUE ICE 500ML', 2, 1.55, 10, true, 'bebidas'),
('7702192422051', 'GATORADE FRUTOS TROPICALES 500ML', 2, 1.55, 10, true, 'bebidas'),
('7590066112548', 'JUGO FRUGY NARANJADA 1.5L', 1.4, 1.04, 10, true, 'bebidas'),
('7590066113545', 'JUGO FRUGY MANZANA 1.5L', 1.4, 1.04, 10, true, 'bebidas'),
('73422006', 'JUGO FRUBYS PERA 1.5L', 1.4, 1.04, 10, true, 'bebidas');

-- 6. Asignar categorías (si usas product_categories)
INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id FROM products p CROSS JOIN categories c
WHERE p.category = c.name;
