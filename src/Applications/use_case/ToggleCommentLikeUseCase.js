class ToggleCommentLikeUseCase {
  constructor({ threadRepository, commentRepository }) {
    this._threadRepository = threadRepository;
    this._commentRepository = commentRepository;
  }

  async execute(useCasePayload) {
    const { threadId, commentId, owner } = useCasePayload;

    await this._threadRepository.verifyAvailableThread(threadId);
    await this._commentRepository.verifyAvailableComment(commentId);
    await this._commentRepository.toggleCommentLike(commentId, owner);
  }
}

export default ToggleCommentLikeUseCase;
