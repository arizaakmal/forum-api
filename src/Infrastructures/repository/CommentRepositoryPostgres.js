import AddedComment from '../../Domains/comments/entities/AddedComment.js';
import CommentRepository from '../../Domains/comments/CommentRepository.js';
import NotFoundError from '../../Commons/exceptions/NotFoundError.js';
import AuthorizationError from '../../Commons/exceptions/AuthorizationError.js';

class CommentRepositoryPostgres extends CommentRepository {
  constructor(pool, idGenerator) {
    super();
    this._pool = pool;
    this._idGenerator = idGenerator;
  }

  async addComment(newComment) {
    const { content, threadId, owner } = newComment;
    const id = `comment-${this._idGenerator()}`;
    const date = new Date().toISOString();

    const query = {
      text: 'INSERT INTO comments(id, content, thread_id, owner, date) VALUES($1, $2, $3, $4, $5) RETURNING id, content, owner',
      values: [id, content, threadId, owner, date],
    };

    const result = await this._pool.query(query);

    return new AddedComment({ ...result.rows[0] });
  }

  async verifyAvailableComment(commentId) {
    const query = {
      text: 'SELECT id FROM comments WHERE id = $1',
      values: [commentId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('komentar tidak ditemukan');
    }
  }

  async verifyCommentOwner(commentId, owner) {
    const query = {
      text: 'SELECT owner FROM comments WHERE id = $1',
      values: [commentId],
    };

    const result = await this._pool.query(query);

    if (result.rows[0].owner !== owner) {
      throw new AuthorizationError('anda tidak berhak mengakses resource ini');
    }
  }

  async deleteComment(commentId) {
    const query = {
      text: 'UPDATE comments SET is_delete = true WHERE id = $1',
      values: [commentId],
    };

    await this._pool.query(query);
  }

  async toggleCommentLike(commentId, owner) {
    const verifyQuery = {
      text: 'SELECT 1 FROM user_comment_likes WHERE comment_id = $1 AND owner = $2',
      values: [commentId, owner],
    };

    const verifyResult = await this._pool.query(verifyQuery);

    if (verifyResult.rowCount > 0) {
      const unlikeQuery = {
        text: 'DELETE FROM user_comment_likes WHERE comment_id = $1 AND owner = $2',
        values: [commentId, owner],
      };

      await this._pool.query(unlikeQuery);
      return;
    }

    const likeQuery = {
      text: 'INSERT INTO user_comment_likes(comment_id, owner) VALUES($1, $2)',
      values: [commentId, owner],
    };

    await this._pool.query(likeQuery);
  }
}

export default CommentRepositoryPostgres;
