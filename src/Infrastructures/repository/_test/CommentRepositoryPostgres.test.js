import pool from '../../database/postgres/pool.js';
import UsersTableTestHelper from '../../../../tests/UsersTableTestHelper.js';
import ThreadsTableTestHelper from '../../../../tests/ThreadsTableTestHelper.js';
import CommentsTableTestHelper from '../../../../tests/CommentsTableTestHelper.js';
import UserCommentLikesTableTestHelper from '../../../../tests/UserCommentLikesTableTestHelper.js';
import CommentRepositoryPostgres from '../CommentRepositoryPostgres.js';
import NewComment from '../../../Domains/comments/entities/NewComment.js';
import AddedComment from '../../../Domains/comments/entities/AddedComment.js';
import NotFoundError from '../../../Commons/exceptions/NotFoundError.js';
import AuthorizationError from '../../../Commons/exceptions/AuthorizationError.js';

describe('CommentRepositoryPostgres', () => {
  afterEach(async () => {
    await UserCommentLikesTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('addComment function', () => {
    it('should persist comment and return added comment correctly', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-comment-123', username: 'dicoding-comment-1' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-123', owner: 'user-comment-123' });
      const newComment = new NewComment({
        content: 'sebuah comment',
        threadId: 'thread-123',
        owner: 'user-comment-123',
      });
      const fakeIdGenerator = () => '123';
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, fakeIdGenerator);

      // Action
      const addedComment = await commentRepositoryPostgres.addComment(newComment);

      // Assert
      const comments = await CommentsTableTestHelper.findCommentsById('comment-123');
      expect(comments).toHaveLength(1);
      expect(addedComment).toStrictEqual(new AddedComment({
        id: 'comment-123',
        content: 'sebuah comment',
        owner: 'user-comment-123',
      }));
    });
  });

  describe('verifyAvailableComment function', () => {
    it('should not throw NotFoundError when comment available', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-comment-availability', username: 'dicoding-comment-availability' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-comment-availability', owner: 'user-comment-availability' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-availability-123',
        threadId: 'thread-comment-availability',
        owner: 'user-comment-availability',
      });
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(commentRepositoryPostgres.verifyAvailableComment('comment-availability-123')).resolves.not.toThrowError(NotFoundError);
    });

    it('should throw NotFoundError when comment unavailable', async () => {
      // Arrange
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(commentRepositoryPostgres.verifyAvailableComment('comment-not-found')).rejects.toThrowError(NotFoundError);
    });
  });

  describe('verifyCommentOwner function', () => {
    it('should not throw AuthorizationError when owner matches', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-comment-owner', username: 'dicoding-comment-owner' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-comment-owner', owner: 'user-comment-owner' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-owner-123',
        threadId: 'thread-comment-owner',
        owner: 'user-comment-owner',
      });
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(commentRepositoryPostgres.verifyCommentOwner('comment-owner-123', 'user-comment-owner')).resolves.not.toThrowError(AuthorizationError);
    });

    it('should throw AuthorizationError when owner does not match', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-comment-owner-1', username: 'dicoding-comment-owner-1' });
      await UsersTableTestHelper.addUser({ id: 'user-comment-owner-2', username: 'dicoding-comment-owner-2' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-comment-owner-2', owner: 'user-comment-owner-1' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-owner-124',
        threadId: 'thread-comment-owner-2',
        owner: 'user-comment-owner-1',
      });
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, () => '123');

      // Action & Assert
      await expect(commentRepositoryPostgres.verifyCommentOwner('comment-owner-124', 'user-comment-owner-2')).rejects.toThrowError(AuthorizationError);
    });
  });

  describe('deleteComment function', () => {
    it('should soft delete comment correctly', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-comment-delete', username: 'dicoding-comment-delete' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-comment-delete', owner: 'user-comment-delete' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-delete-123',
        threadId: 'thread-comment-delete',
        owner: 'user-comment-delete',
      });
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, () => '123');

      // Action
      await commentRepositoryPostgres.deleteComment('comment-delete-123');

      // Assert
      const comments = await CommentsTableTestHelper.findCommentsById('comment-delete-123');
      expect(comments).toHaveLength(1);
      expect(comments[0].is_delete).toEqual(true);
    });
  });

  describe('toggleCommentLike function', () => {
    it('should persist like when user has not liked comment yet', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-comment-like-123', username: 'dicoding-comment-like-1' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-comment-like-123', owner: 'user-comment-like-123' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-like-123',
        threadId: 'thread-comment-like-123',
        owner: 'user-comment-like-123',
      });
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, () => '123');

      // Action
      await commentRepositoryPostgres.toggleCommentLike('comment-like-123', 'user-comment-like-123');

      // Assert
      const likes = await UserCommentLikesTableTestHelper.findLikeByCommentIdAndOwner(
        'comment-like-123',
        'user-comment-like-123',
      );
      expect(likes).toHaveLength(1);
    });

    it('should delete like when user already liked comment', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-comment-like-124', username: 'dicoding-comment-like-2' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-comment-like-124', owner: 'user-comment-like-124' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-like-124',
        threadId: 'thread-comment-like-124',
        owner: 'user-comment-like-124',
      });
      await UserCommentLikesTableTestHelper.addLike({
        commentId: 'comment-like-124',
        owner: 'user-comment-like-124',
      });
      const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, () => '123');

      // Action
      await commentRepositoryPostgres.toggleCommentLike('comment-like-124', 'user-comment-like-124');

      // Assert
      const likes = await UserCommentLikesTableTestHelper.findLikeByCommentIdAndOwner(
        'comment-like-124',
        'user-comment-like-124',
      );
      expect(likes).toHaveLength(0);
    });
  });
});
