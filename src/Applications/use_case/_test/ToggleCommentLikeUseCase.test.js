import { vi } from 'vitest';
import ToggleCommentLikeUseCase from '../ToggleCommentLikeUseCase.js';
import ThreadRepository from '../../../Domains/threads/ThreadRepository.js';
import CommentRepository from '../../../Domains/comments/CommentRepository.js';

describe('ToggleCommentLikeUseCase', () => {
  it('should orchestrating toggle comment like action correctly', async () => {
    // Arrange
    const useCasePayload = {
      threadId: 'thread-123',
      commentId: 'comment-123',
      owner: 'user-123',
    };

    const mockThreadRepository = new ThreadRepository();
    mockThreadRepository.verifyAvailableThread = vi.fn()
      .mockImplementation(() => Promise.resolve());

    const mockCommentRepository = new CommentRepository();
    mockCommentRepository.verifyAvailableComment = vi.fn()
      .mockImplementation(() => Promise.resolve());
    mockCommentRepository.toggleCommentLike = vi.fn()
      .mockImplementation(() => Promise.resolve());

    const toggleCommentLikeUseCase = new ToggleCommentLikeUseCase({
      threadRepository: mockThreadRepository,
      commentRepository: mockCommentRepository,
    });

    // Action
    await toggleCommentLikeUseCase.execute(useCasePayload);

    // Assert
    expect(mockThreadRepository.verifyAvailableThread).toBeCalledWith(useCasePayload.threadId);
    expect(mockCommentRepository.verifyAvailableComment).toBeCalledWith(useCasePayload.commentId);
    expect(mockCommentRepository.toggleCommentLike)
      .toBeCalledWith(useCasePayload.commentId, useCasePayload.owner);
  });
});
