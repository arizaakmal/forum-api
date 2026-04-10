/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('user_comment_likes', {
    'comment_id': {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    owner: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
  });

  pgm.addConstraint('user_comment_likes', 'fk_user_comment_likes.comment_id_comments.id', 'FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE');
  pgm.addConstraint('user_comment_likes', 'fk_user_comment_likes.owner_users.id', 'FOREIGN KEY(owner) REFERENCES users(id) ON DELETE CASCADE');
  pgm.addConstraint('user_comment_likes', 'unique_user_comment_likes.comment_id_owner', 'UNIQUE(comment_id, owner)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('user_comment_likes', 'fk_user_comment_likes.comment_id_comments.id');
  pgm.dropConstraint('user_comment_likes', 'fk_user_comment_likes.owner_users.id');
  pgm.dropConstraint('user_comment_likes', 'unique_user_comment_likes.comment_id_owner');
  pgm.dropTable('user_comment_likes');
};
