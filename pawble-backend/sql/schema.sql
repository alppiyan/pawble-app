-- Pawble — initial schema (v2)
-- Charset utf8mb4 so descriptions can carry emoji / extended punctuation.
-- All FKs use ON DELETE CASCADE: removing a user removes their pets, swipes, messages.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(50)  NOT NULL,
  surname     VARCHAR(50)  NOT NULL,
  email       VARCHAR(120) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  location    VARCHAR(120) NOT NULL DEFAULT '',
  is_shelter  TINYINT(1)   NOT NULL DEFAULT 0,
  is_admin    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- species
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS species (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(60)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_species_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- breeds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS breeds (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  species_id INT UNSIGNED NOT NULL,
  name       VARCHAR(80)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_breeds_species_name (species_id, name),
  CONSTRAINT fk_breeds_species
    FOREIGN KEY (species_id) REFERENCES species(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- pets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pets (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  username    VARCHAR(50)  NOT NULL,
  species_id  INT UNSIGNED NOT NULL,
  breed_id    INT UNSIGNED NOT NULL,
  gender      ENUM('erkek','disi') NOT NULL,
  age         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  vaccinated  TINYINT(1)   NOT NULL DEFAULT 0,
  description TEXT         NULL,
  image_path  VARCHAR(500) NOT NULL DEFAULT '',
  video_path  VARCHAR(500) NULL,
  goal        ENUM('mating','adoption') NOT NULL DEFAULT 'mating',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pets_user (user_id),
  KEY idx_pets_goal (goal),
  KEY idx_pets_species (species_id),
  CONSTRAINT fk_pets_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pets_species
    FOREIGN KEY (species_id) REFERENCES species(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pets_breed
    FOREIGN KEY (breed_id) REFERENCES breeds(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- likes (swipes — left/right/super, plus matched state)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS likes (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  liker_pet_id  INT UNSIGNED NOT NULL,
  liked_pet_id  INT UNSIGNED NOT NULL,
  status        ENUM('pending','super','matched','rejected') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_likes_pair (liker_pet_id, liked_pet_id),
  KEY idx_likes_liked (liked_pet_id, status),
  CONSTRAINT fk_likes_liker
    FOREIGN KEY (liker_pet_id) REFERENCES pets(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_likes_liked
    FOREIGN KEY (liked_pet_id) REFERENCES pets(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id   INT UNSIGNED NOT NULL,
  receiver_id INT UNSIGNED NOT NULL,
  content     TEXT         NOT NULL,
  sent_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_pair (sender_id, receiver_id, sent_at),
  KEY idx_messages_inbox (receiver_id, sent_at),
  CONSTRAINT fk_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_messages_receiver
    FOREIGN KEY (receiver_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- seed: species + a handful of breeds so the metadata endpoint returns useful rows
-- ---------------------------------------------------------------------------
INSERT INTO species (name) VALUES
  ('Köpek'),
  ('Kedi'),
  ('Kuş'),
  ('Tavşan')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO breeds (species_id, name)
SELECT s.id, b.name FROM species s
JOIN (
  SELECT 'Köpek' AS species, 'Golden Retriever' AS name UNION ALL
  SELECT 'Köpek', 'Labrador'                            UNION ALL
  SELECT 'Köpek', 'Pomeranian'                          UNION ALL
  SELECT 'Köpek', 'Husky'                               UNION ALL
  SELECT 'Köpek', 'Kangal'                              UNION ALL
  SELECT 'Köpek', 'Karışık'                             UNION ALL
  SELECT 'Kedi',  'Tekir'                               UNION ALL
  SELECT 'Kedi',  'British Shorthair'                   UNION ALL
  SELECT 'Kedi',  'Scottish Fold'                       UNION ALL
  SELECT 'Kedi',  'Van Kedisi'                          UNION ALL
  SELECT 'Kedi',  'Ankara Kedisi'                       UNION ALL
  SELECT 'Kedi',  'Karışık'                             UNION ALL
  SELECT 'Kuş',   'Muhabbet Kuşu'                       UNION ALL
  SELECT 'Kuş',   'Kanarya'                             UNION ALL
  SELECT 'Kuş',   'Papağan'                             UNION ALL
  SELECT 'Tavşan','Hollanda Cüce'                       UNION ALL
  SELECT 'Tavşan','Karışık'
) b ON b.species = s.name
ON DUPLICATE KEY UPDATE name = VALUES(name);
