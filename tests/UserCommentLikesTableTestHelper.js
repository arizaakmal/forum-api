/* istanbul ignore file */
import pool from '../src/Infrastructures/database/postgres/pool.js';

const UserCommentLikesTableTestHelper = {
  async addLike({
    commentId = 'comment-123',
    owner = 'user-123',
  }) {
    const query = {
      text: 'INSERT INTO user_comment_likes(comment_id, owner) VALUES($1, $2)',
      values: [commentId, owner],
    };

    await pool.query(query);
  },

  async findLikeByCommentIdAndOwner(commentId, owner) {
    const query = {
      text: 'SELECT * FROM user_comment_likes WHERE comment_id = $1 AND owner = $2',
      values: [commentId, owner],
    };

    const result = await pool.query(query);

    return result.rows;
  },

  async findLikesByCommentId(commentId) {
    const query = {
      text: 'SELECT * FROM user_comment_likes WHERE comment_id = $1',
      values: [commentId],
    };

    const result = await pool.query(query);

    return result.rows;
  },

  async cleanTable() {
    await pool.query('DELETE FROM user_comment_likes WHERE 1=1');
  },
};

export default UserCommentLikesTableTestHelper;
