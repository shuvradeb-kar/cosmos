"""
 Copyright (C) 2014 Maruf Maniruzzaman
 Website: http://cosmosframework.com
 Author: Maruf Maniruzzaman
 License :: OSI Approved :: MIT License
"""

from cosmos.service import requesthandler

import tornado.ioloop
import tornado.web
import tornado.options
import tornado.template
import tornado.websocket
from tornado import gen
import motor
import hashlib

from cosmos.service.utils import MongoObjectJSONEncoder
from cosmos.dataservice.objectservice import *


class GridFSServiceHandler(requesthandler.RequestHandler):

    @tornado.web.asynchronous
    @gen.coroutine
    def get(self, object_path):
        params = object_path.split('/')
        params = filter(len, params)
        if len(params) < 1 or len(params)>2:
            raise tornado.web.HTTPError(404, "Not found")

        object_name = params[0]

        if not object_name:
            raise tornado.web.HTTPError(404, "Not found")

        object_full_name = object_name

        id = None
        if len(params)==2:
            id = params[1]

        db = self.settings['db']

        preprocessor_list = get_operation_preprocessor(object_full_name, AccessType.READ)
        for preprocessor in preprocessor_list:
            yield  preprocessor(db, object_full_name, id, AccessType.READ)

        result = None
        if id and len(id)>0:
            obj_serv = ObjectService()
            promise = obj_serv.load_file(self.current_user, db, object_full_name, id)
            result = yield promise

            self.write(result.get("body"))
            content_type = result.get("content_type")
            if content_type:
                self.set_header("Content-Type", content_type)
        else:
            self.write('''
            <form enctype="multipart/form-data" method="POST">
                File tu upload: <input name="uploadedfile" type="file" /><br />
                <input type="submit" value="Upload File" />
            </form>''')

        post_processor_list = get_operation_postprocessor(object_full_name, AccessType.READ)
        for post_processor in post_processor_list:
            yield post_processor(db, object_full_name, result, AccessType.READ)

        self.finish()

    @tornado.web.asynchronous
    @gen.coroutine
    def post(self, object_path):
        params = object_path.split('/')
        params = filter(len, params)
        object_name = params[0]

        object_full_name = object_name
        file = self.request.files["uploadedfile"][0]

        db = self.settings['db']

        preprocessor_list = get_operation_preprocessor(object_full_name, AccessType.INSERT)
        for preprocessor in preprocessor_list:
            yield preprocessor(db, object_full_name, file, AccessType.INSERT)

        obj_serv = ObjectService()
        promise = obj_serv.save_file(self.current_user, db, object_full_name, file)
        result = yield promise

        self.write(json.dumps(result))

        post_processor_list = get_operation_postprocessor(object_full_name, AccessType.INSERT)
        for post_processor in post_processor_list:
            yield  post_processor(db, object_full_name, result, AccessType.INSERT)

        self.finish()

    @tornado.web.asynchronous
    @gen.coroutine
    def delete(self, object_path):
        params = object_path.split('/')
        params = filter(len, params)
        object_name = params[0]

        if not object_name or len(object_name) < 1:
            raise tornado.web.HTTPError(404, "Not found")

        object_full_name = object_name

        file_id = None
        if len(params) == 2:
            file_id = params[1]
        else:
            raise tornado.web.HTTPError(400, "File id required")


        if not file_id or len(file_id)<1:
            raise tornado.web.HTTPError(400, "File id required")

        db = self.settings['db']

        preprocessor_list = get_operation_preprocessor(object_full_name, AccessType.DELETE)
        for preprocessor in preprocessor_list:
            yield preprocessor(object_full_name, None, AccessType.DELETE)

        obj_serv = ObjectService()
        yield obj_serv.delete_file(self.current_user, db, object_full_name, file_id)


        post_processor_list = get_operation_postprocessor(object_full_name, AccessType.DELETE)
        for post_processor in post_processor_list:
            yield  post_processor(db, object_full_name, None, AccessType.DELETE)

        self.write('{"result":"OK"}')
        self.finish()
