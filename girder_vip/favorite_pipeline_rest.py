from girder.api.rest import Resource
from girder.api import access
from girder.api.describe import Description, autoDescribeRoute
from .models.favorite_pipeline import FavoritePipeline as FavoritePipelineModel

# Create new route favorite_pipeline
class FavoritePipeline(Resource):
    def __init__(self):
        super(FavoritePipeline, self).__init__()
        self.resourceName = 'favorite_pipeline'
        self.model = FavoritePipelineModel()

        self.route('GET', (), self.getFavorites)
        self.route('POST', (), self.createFavorite)
        self.route('DELETE', (':id',), self.removeFavorite)

    @access.user
    @autoDescribeRoute(Description("Get user favorites pipelines"))
    def getFavorites(self):
        userId = str(self.getCurrentUser()['_id'])
        return list(self.model.find({'userId': userId}))

    @access.user
    @autoDescribeRoute(
        Description("Add favorite pipeline")
        .param('pipelineName', 'Pipeline name', required=True)
    )
    def createFavorite(self, params):
        return self.model.create({
            'userId': str(self.getCurrentUser()['_id']),
            'pipelineName': params['pipelineName']
        })

    @access.user
    @autoDescribeRoute(
        Description("Remove favorite pipeline")
        .modelParam('id', 'Id of the favorite pipeline', model=FavoritePipelineModel, destName='favorite')
    )
    def removeFavorite(self, favorite):
        self.model.remove(favorite)
        return {'message': 'Removed favorite pipeline %s.' % favorite['pipelineName']}