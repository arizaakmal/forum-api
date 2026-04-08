import AddedThread from '../../../Domains/threads/entities/AddedThread.js';
import pool from '../../database/postgres/pool.js';
import ThreadRepositoryPostgres from '../ThreadRepositoryPostgres.js';
import ThreadsTableTestHelper from '../../../../tests/ThreadsTableTestHelper.js';
import UsersTableTestHelper from '../../../../tests/UsersTableTestHelper.js';
import NewThread from '../../../Domains/threads/entities/NewThread.js';
import NotFoundError from '../../../Commons/exceptions/NotFoundError.js';
import CommentsTableTestHelper from '../../../../tests/CommentsTableTestHelper.js';
import RepliesTableTestHelper from '../../../../tests/RepliesTableTestHelper.js';

describe('ThreadRepositoryPostgres', () => {
  afterEach(async () => {
    await RepliesTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('addThread function', () => {
    it('should persist thread and return added thread correctly', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding-thread-1' });
      const newThread = new NewThread({
        title: 'sebuah thread',
        body: 'isi thread',
        owner: 'user-123',
      });
      const fakeIdGenerator = () => 'repo-thread-123';
      const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, fakeIdGenerator);

      // Action
      const addedThread = await threadRepositoryPostgres.addThread(newThread);

      // Assert
      const threads = await ThreadsTableTestHelper.findThreadsById('thread-repo-thread-123');
      expect(threads).toHaveLength(1);
      expect(addedThread).toStrictEqual(new AddedThread({
        id: 'thread-repo-thread-123',
        title: 'sebuah thread',
        owner: 'user-123',
      }));
    });
  });

  describe('verifyAvailableThread function', () => {
    it('should not throw NotFoundError when thread available', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding-thread-2' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-123', owner: 'user-123' });
      const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(threadRepositoryPostgres.verifyAvailableThread('thread-123')).resolves.not.toThrowError(NotFoundError);
    });

    it('should throw NotFoundError when thread unavailable', async () => {
      // Arrange
      const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(threadRepositoryPostgres.verifyAvailableThread('thread-123')).rejects.toThrowError(NotFoundError);
    });
  });

  describe('getThreadById function', () => {
    it('should return thread details correctly', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-thread-detail-123', username: 'dicoding-thread-detail' });
      await UsersTableTestHelper.addUser({ id: 'user-thread-comment-123', username: 'johndoe-thread-detail' });
      await ThreadsTableTestHelper.addThread({
        id: 'thread-detail-123',
        title: 'sebuah thread',
        body: 'sebuah body thread',
        owner: 'user-thread-detail-123',
        date: '2021-08-08T07:19:09.775Z',
      });
      await CommentsTableTestHelper.addComment({
        id: 'comment-detail-123',
        content: 'sebuah comment',
        threadId: 'thread-detail-123',
        owner: 'user-thread-comment-123',
        date: '2021-08-08T07:22:33.555Z',
      });
      await CommentsTableTestHelper.addComment({
        id: 'comment-detail-124',
        content: 'sebuah comment kedua',
        threadId: 'thread-detail-123',
        owner: 'user-thread-detail-123',
        date: '2021-08-08T07:26:21.338Z',
      });
      await RepliesTableTestHelper.addReply({
        id: 'reply-detail-123',
        content: 'sebuah balasan',
        commentId: 'comment-detail-123',
        owner: 'user-thread-detail-123',
        date: '2021-08-08T07:27:21.338Z',
      });
      const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, () => '123');

      // Action
      const thread = await threadRepositoryPostgres.getThreadById('thread-detail-123');

      // Assert
      expect(thread).toStrictEqual({
        id: 'thread-detail-123',
        title: 'sebuah thread',
        body: 'sebuah body thread',
        date: '2021-08-08T07:19:09.775Z',
        username: 'dicoding-thread-detail',
        comments: [
          {
            id: 'comment-detail-123',
            username: 'johndoe-thread-detail',
            date: '2021-08-08T07:22:33.555Z',
            content: 'sebuah comment',
            replies: [
              {
                id: 'reply-detail-123',
                username: 'dicoding-thread-detail',
                date: '2021-08-08T07:27:21.338Z',
                content: 'sebuah balasan',
              },
            ],
          },
          {
            id: 'comment-detail-124',
            username: 'dicoding-thread-detail',
            date: '2021-08-08T07:26:21.338Z',
            content: 'sebuah comment kedua',
            replies: [],
          },
        ],
      });
    });

    it('should return thread details with empty comments when thread has no comment', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-thread-no-comment-123', username: 'dicoding-thread-no-comment' });
      await ThreadsTableTestHelper.addThread({
        id: 'thread-no-comment-123',
        title: 'thread tanpa comment',
        body: 'body thread tanpa comment',
        owner: 'user-thread-no-comment-123',
        date: '2021-08-08T07:19:09.775Z',
      });
      const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, () => '123');

      // Action
      const thread = await threadRepositoryPostgres.getThreadById('thread-no-comment-123');

      // Assert
      expect(thread).toStrictEqual({
        id: 'thread-no-comment-123',
        title: 'thread tanpa comment',
        body: 'body thread tanpa comment',
        date: '2021-08-08T07:19:09.775Z',
        username: 'dicoding-thread-no-comment',
        comments: [],
      });
    });

    it('should throw NotFoundError when thread unavailable', async () => {
      // Arrange
      const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(threadRepositoryPostgres.getThreadById('thread-not-found')).rejects.toThrowError(NotFoundError);
    });

    it('should return masked content for deleted comment', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-thread-delete-1', username: 'dicoding-thread-delete-1' });
      await UsersTableTestHelper.addUser({ id: 'user-thread-delete-2', username: 'johndoe-thread-delete-2' });
      await ThreadsTableTestHelper.addThread({
        id: 'thread-delete-comment-123',
        title: 'thread dengan comment terhapus',
        body: 'body thread',
        owner: 'user-thread-delete-1',
        date: '2021-08-08T07:19:09.775Z',
      });
      await CommentsTableTestHelper.addComment({
        id: 'comment-delete-content-123',
        content: 'comment yang sudah dihapus',
        threadId: 'thread-delete-comment-123',
        owner: 'user-thread-delete-2',
        date: '2021-08-08T07:22:33.555Z',
        isDelete: true,
      });
      const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, () => '123');

      // Action
      const thread = await threadRepositoryPostgres.getThreadById('thread-delete-comment-123');

      // Assert
      expect(thread.comments).toStrictEqual([
        {
          id: 'comment-delete-content-123',
          username: 'johndoe-thread-delete-2',
          date: '2021-08-08T07:22:33.555Z',
          content: '**komentar telah dihapus**',
          replies: [],
        },
      ]);
    });

    it('should return masked content for deleted reply', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-thread-reply-delete-1', username: 'dicoding-thread-reply-delete-1' });
      await UsersTableTestHelper.addUser({ id: 'user-thread-reply-delete-2', username: 'johndoe-thread-reply-delete-2' });
      await ThreadsTableTestHelper.addThread({
        id: 'thread-delete-reply-123',
        title: 'thread dengan balasan terhapus',
        body: 'body thread',
        owner: 'user-thread-reply-delete-1',
        date: '2021-08-08T07:19:09.775Z',
      });
      await CommentsTableTestHelper.addComment({
        id: 'comment-delete-reply-123',
        content: 'comment untuk balasan terhapus',
        threadId: 'thread-delete-reply-123',
        owner: 'user-thread-reply-delete-2',
        date: '2021-08-08T07:22:33.555Z',
      });
      await RepliesTableTestHelper.addReply({
        id: 'reply-delete-content-123',
        content: 'balasan yang sudah dihapus',
        commentId: 'comment-delete-reply-123',
        owner: 'user-thread-reply-delete-1',
        date: '2021-08-08T07:27:21.338Z',
        isDelete: true,
      });
      const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, () => '123');

      // Action
      const thread = await threadRepositoryPostgres.getThreadById('thread-delete-reply-123');

      // Assert
      expect(thread.comments).toStrictEqual([
        {
          id: 'comment-delete-reply-123',
          username: 'johndoe-thread-reply-delete-2',
          date: '2021-08-08T07:22:33.555Z',
          content: 'comment untuk balasan terhapus',
          replies: [
            {
              id: 'reply-delete-content-123',
              username: 'dicoding-thread-reply-delete-1',
              date: '2021-08-08T07:27:21.338Z',
              content: '**balasan telah dihapus**',
            },
          ],
        },
      ]);
    });
  });
});