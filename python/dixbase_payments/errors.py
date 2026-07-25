class DixBaseError(Exception):
    def __init__(self, message, status_code=0, code=None, request_id=None, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.request_id = request_id
        self.details = details


class DixBaseWebhookSignatureError(Exception):
    pass
