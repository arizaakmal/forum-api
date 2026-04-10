import AddedThread from '../../Domains/threads/entities/AddedThread.js';
import ThreadRepository from '../../Domains/threads/ThreadRepository.js';
import NotFoundError from '../../Commons/exceptions/NotFoundError.js';

class ThreadRepositoryPostgres extends ThreadRepository {
  constructor(pool, idGenerator) {
    super();
    this._pool = pool;
    this._idGenerator = idGenerator;
  }

  async addThread(newThread) {
    const { title, body, owner } = newThread;
    const id = `thread-${this._idGenerator()}`;
    const date = new Date().toISOString();

    const query = {
      text: 'INSERT INTO threads VALUES($1, $2, $3, $4, $5) RETURNING id, title, owner',
      values: [id, title, body, owner, date],
    };

    const result = await this._pool.query(query);

    return new AddedThread({ ...result.rows[0] });
  }

  async verifyAvailableThread(threadId) {
    const query = {
      text: 'SELECT id FROM threads WHERE id = $1',
      values: [threadId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('thread tidak ditemukan');
    }
  }

  async getThreadById(threadId) {
    const threadQuery = {
      text: `SELECT threads.id, threads.title, threads.body, threads.date, users.username
        FROM threads
        LEFT JOIN users ON users.id = threads.owner
        WHERE threads.id = $1`,
      values: [threadId],
    };

    const threadResult = await this._pool.query(threadQuery);

    if (!threadResult.rowCount) {
      throw new NotFoundError('thread tidak ditemukan');
    }

    const commentsQuery = {
      text: `SELECT comments.id, users.username, comments.date,
        CASE
          WHEN comments.is_delete = true THEN '**komentar telah dihapus**'
          ELSE comments.content
        END AS content,
        (
          SELECT COUNT(*)
          FROM user_comment_likes
          WHERE user_comment_likes.comment_id = comments.id
        )::int AS like_count
        FROM comments
        LEFT JOIN users ON users.id = comments.owner
        WHERE comments.thread_id = $1
        ORDER BY comments.date ASC`,
      values: [threadId],
    };

    const commentsResult = await this._pool.query(commentsQuery);

    if (commentsResult.rows.length === 0) {
      return {
        ...threadResult.rows[0],
        comments: [],
      };
    }

    const commentIds = commentsResult.rows.map((comment) => comment.id);
    const repliesQuery = {
      text: `SELECT replies.id, replies.comment_id, users.username, replies.date,
        CASE
          WHEN replies.is_delete = true THEN '**balasan telah dihapus**'
          ELSE replies.content
        END AS content
        FROM replies
        LEFT JOIN users ON users.id = replies.owner
        WHERE replies.comment_id = ANY($1::varchar[])
        ORDER BY replies.date ASC`,
      values: [commentIds],
    };

    const repliesResult = await this._pool.query(repliesQuery);
    const repliesByCommentId = repliesResult.rows.reduce((acc, reply) => {
      if (!acc[reply.comment_id]) {
        acc[reply.comment_id] = [];
      }

      acc[reply.comment_id].push({
        id: reply.id,
        username: reply.username,
        date: reply.date,
        content: reply.content,
      });

      return acc;
    }, {});

    const commentsWithReplies = commentsResult.rows.map((comment) => ({
      id: comment.id,
      username: comment.username,
      date: comment.date,
      content: comment.content,
      likeCount: comment.like_count,
      replies: repliesByCommentId[comment.id] || [],
    }));

    return {
      ...threadResult.rows[0],
      comments: commentsWithReplies,
    };
  }
}

export default ThreadRepositoryPostgres;
