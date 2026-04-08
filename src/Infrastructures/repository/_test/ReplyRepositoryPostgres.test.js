import pool from '../../database/postgres/pool.js';
import UsersTableTestHelper from '../../../../tests/UsersTableTestHelper.js';
import ThreadsTableTestHelper from '../../../../tests/ThreadsTableTestHelper.js';
import CommentsTableTestHelper from '../../../../tests/CommentsTableTestHelper.js';
import RepliesTableTestHelper from '../../../../tests/RepliesTableTestHelper.js';
import ReplyRepositoryPostgres from '../ReplyRepositoryPostgres.js';
import NewReply from '../../../Domains/replies/entities/NewReply.js';
import AddedReply from '../../../Domains/replies/entities/AddedReply.js';
import NotFoundError from '../../../Commons/exceptions/NotFoundError.js';
import AuthorizationError from '../../../Commons/exceptions/AuthorizationError.js';

describe('ReplyRepositoryPostgres', () => {
  afterEach(async () => {
    await RepliesTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('addReply function', () => {
    it('should persist reply and return added reply correctly', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-reply-123', username: 'dicoding-reply-1' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-reply-123', owner: 'user-reply-123' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-reply-123',
        threadId: 'thread-reply-123',
        owner: 'user-reply-123',
      });
      const newReply = new NewReply({
        content: 'sebuah balasan',
        threadId: 'thread-reply-123',
        commentId: 'comment-reply-123',
        owner: 'user-reply-123',
      });
      const fakeIdGenerator = () => '123';
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool, fakeIdGenerator);

      // Action
      const addedReply = await replyRepositoryPostgres.addReply(newReply);

      // Assert
      const replies = await RepliesTableTestHelper.findRepliesById('reply-123');
      expect(replies).toHaveLength(1);
      expect(addedReply).toStrictEqual(new AddedReply({
        id: 'reply-123',
        content: 'sebuah balasan',
        owner: 'user-reply-123',
      }));
    });
  });

  describe('verifyAvailableReply function', () => {
    it('should not throw NotFoundError when reply is available', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-verify-reply', username: 'dicoding-verify-reply' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-verify-reply', owner: 'user-verify-reply' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-verify-reply',
        threadId: 'thread-verify-reply',
        owner: 'user-verify-reply',
      });
      await RepliesTableTestHelper.addReply({
        id: 'reply-verify-123',
        commentId: 'comment-verify-reply',
        owner: 'user-verify-reply',
      });
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(replyRepositoryPostgres.verifyAvailableReply('reply-verify-123')).resolves.not.toThrowError(NotFoundError);
    });

    it('should throw NotFoundError when reply is not available', async () => {
      // Arrange
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(replyRepositoryPostgres.verifyAvailableReply('reply-not-found')).rejects.toThrowError(NotFoundError);
    });
  });

  describe('verifyReplyOwner function', () => {
    it('should not throw AuthorizationError when owner matches', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-owner-reply', username: 'dicoding-owner-reply' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-owner-reply', owner: 'user-owner-reply' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-owner-reply',
        threadId: 'thread-owner-reply',
        owner: 'user-owner-reply',
      });
      await RepliesTableTestHelper.addReply({
        id: 'reply-owner-123',
        commentId: 'comment-owner-reply',
        owner: 'user-owner-reply',
      });
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(replyRepositoryPostgres.verifyReplyOwner('reply-owner-123', 'user-owner-reply')).resolves.not.toThrowError(AuthorizationError);
    });

    it('should throw AuthorizationError when owner does not match', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-owner-reply-2', username: 'dicoding-owner-reply-2' });
      await UsersTableTestHelper.addUser({ id: 'user-not-owner-reply-2', username: 'johndoe-owner-reply-2' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-owner-reply-2', owner: 'user-owner-reply-2' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-owner-reply-2',
        threadId: 'thread-owner-reply-2',
        owner: 'user-owner-reply-2',
      });
      await RepliesTableTestHelper.addReply({
        id: 'reply-owner-456',
        commentId: 'comment-owner-reply-2',
        owner: 'user-owner-reply-2',
      });
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(replyRepositoryPostgres.verifyReplyOwner('reply-owner-456', 'user-not-owner-reply-2')).rejects.toThrowError(AuthorizationError);
    });
  });

  describe('deleteReply function', () => {
    it('should soft delete reply from database', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-delete-reply', username: 'dicoding-delete-reply' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-delete-reply', owner: 'user-delete-reply' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-delete-reply',
        threadId: 'thread-delete-reply',
        owner: 'user-delete-reply',
      });
      await RepliesTableTestHelper.addReply({
        id: 'reply-delete-123',
        commentId: 'comment-delete-reply',
        owner: 'user-delete-reply',
      });
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool, () => '123');

      // Action
      await replyRepositoryPostgres.deleteReply('reply-delete-123');

      // Assert
      const replies = await RepliesTableTestHelper.findRepliesById('reply-delete-123');
      expect(replies).toHaveLength(1);
      expect(replies[0].is_delete).toEqual(true);
    });
  });
});
