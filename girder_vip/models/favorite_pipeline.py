#!/usr/bin/env python
# -*- coding: utf-8 -*-

from girder.models.model_base import Model

# Create new db and interactions api/db
class FavoritePipeline(Model):
    def initialize(self):
        self.name = 'favorite_pipeline'
        self.ensureIndices(('userId', 'pipelineName'))

    def validate(self, FavoritePipeline):
        return FavoritePipeline

    def create(self, doc):
        return self.save(doc)

    def remove(self, doc):
        super(FavoritePipeline, self).remove(doc)
