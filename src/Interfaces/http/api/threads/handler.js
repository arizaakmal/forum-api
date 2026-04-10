import AddThreadUseCase from '../../../../Applications/use_case/AddThreadUseCase.js';
import AddCommentUseCase from '../../../../Applications/use_case/AddCommentUseCase.js';
import AddReplyUseCase from '../../../../Applications/use_case/AddReplyUseCase.js';
import DeleteCommentUseCase from '../../../../Applications/use_case/DeleteCommentUseCase.js';
import DeleteReplyUseCase from '../../../../Applications/use_case/DeleteReplyUseCase.js';
import GetThreadUseCase from '../../../../Applications/use_case/GetThreadUseCase.js';
import ToggleCommentLikeUseCase from '../../../../Applications/use_case/ToggleCommentLikeUseCase.js';
import AuthenticationTokenManager from '../../../../Applications/security/AuthenticationTokenManager.js';
import AuthenticationError from '../../../../Commons/exceptions/AuthenticationError.js';

class ThreadsHandler {
  constructor(container) {
    this._container = container;

    this.getThreadByIdHandler = this.getThreadByIdHandler.bind(this);
    this.postThreadHandler = this.postThreadHandler.bind(this);
    this.postCommentHandler = this.postCommentHandler.bind(this);
    this.postReplyHandler = this.postReplyHandler.bind(this);
    this.putCommentLikeHandler = this.putCommentLikeHandler.bind(this);
    this.deleteCommentHandler = this.deleteCommentHandler.bind(this);
    this.deleteReplyHandler = this.deleteReplyHandler.bind(this);
  }

  async getThreadByIdHandler(req, res, next) {
    try {
      const getThreadUseCase = this._container.getInstance(GetThreadUseCase.name);
      const thread = await getThreadUseCase.execute({
        threadId: req.params.threadId,
      });

      res.status(200).json({
        status: 'success',
        data: {
          thread,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async postThreadHandler(req, res, next) {
    try {
      const owner = await this._getOwnerIdFromRequest(req);

      const addThreadUseCase = this._container.getInstance(AddThreadUseCase.name);
      const addedThread = await addThreadUseCase.execute({
        ...req.body,
        owner,
      });

      res.status(201).json({
        status: 'success',
        data: {
          addedThread,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async postCommentHandler(req, res, next) {
    try {
      const owner = await this._getOwnerIdFromRequest(req);
      const addCommentUseCase = this._container.getInstance(AddCommentUseCase.name);
      const addedComment = await addCommentUseCase.execute({
        ...req.body,
        owner,
        threadId: req.params.threadId,
      });

      res.status(201).json({
        status: 'success',
        data: {
          addedComment,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async postReplyHandler(req, res, next) {
    try {
      const owner = await this._getOwnerIdFromRequest(req);
      const addReplyUseCase = this._container.getInstance(AddReplyUseCase.name);
      const addedReply = await addReplyUseCase.execute({
        ...req.body,
        owner,
        threadId: req.params.threadId,
        commentId: req.params.commentId,
      });

      res.status(201).json({
        status: 'success',
        data: {
          addedReply,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCommentHandler(req, res, next) {
    try {
      const owner = await this._getOwnerIdFromRequest(req);
      const deleteCommentUseCase = this._container.getInstance(DeleteCommentUseCase.name);

      await deleteCommentUseCase.execute({
        threadId: req.params.threadId,
        commentId: req.params.commentId,
        owner,
      });

      res.status(200).json({
        status: 'success',
      });
    } catch (error) {
      next(error);
    }
  }

  async putCommentLikeHandler(req, res, next) {
    try {
      const owner = await this._getOwnerIdFromRequest(req);
      const toggleCommentLikeUseCase = this._container.getInstance(ToggleCommentLikeUseCase.name);

      await toggleCommentLikeUseCase.execute({
        threadId: req.params.threadId,
        commentId: req.params.commentId,
        owner,
      });

      res.status(200).json({
        status: 'success',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteReplyHandler(req, res, next) {
    try {
      const owner = await this._getOwnerIdFromRequest(req);
      const deleteReplyUseCase = this._container.getInstance(DeleteReplyUseCase.name);

      await deleteReplyUseCase.execute({
        threadId: req.params.threadId,
        commentId: req.params.commentId,
        replyId: req.params.replyId,
        owner,
      });

      res.status(200).json({
        status: 'success',
      });
    } catch (error) {
      next(error);
    }
  }

  async _getOwnerIdFromRequest(req) {
    const authenticationTokenManager = this._container.getInstance(AuthenticationTokenManager.name);
    const accessToken = this._getAccessTokenFromHeader(req.headers.authorization);

    await authenticationTokenManager.verifyAccessToken(accessToken);
    const { id: owner } = await authenticationTokenManager.decodePayload(accessToken);

    if (!owner) {
      throw new AuthenticationError('access token tidak valid');
    }

    return owner;
  }

  _getAccessTokenFromHeader(authorizationHeader) {
    if (!authorizationHeader) {
      throw new AuthenticationError('Missing authentication');
    }

    if (!authorizationHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('access token tidak valid');
    }

    return authorizationHeader.split(' ')[1];
  }
}

export default ThreadsHandler;
