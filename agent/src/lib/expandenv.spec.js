const expandenv = require('./expandenv');

describe('expand environment vars in string', function () {

    beforeEach(function () {
        process.env.ENVVAR_ONE = 'TESTVALUE'
    })

    afterEach(function () {
        delete process.env.ENVVAR_ONE
    })

    it('should expand simple variable', function () {
        let rawText = '${ENVVAR_ONE}';

        let expandedText = expandenv(rawText);

        expect(expandedText).to.be('TESTVALUE')
    });


    it('should throw on missing variable', function () {
        let rawText = '${ENVVAR_MISSING}';

        try{
            expandenv(rawText);
        } catch (e){
            expect(e.message).to.be('Reference to environment variable ${ENVVAR_MISSING} could not be resolved: ${ENVVAR_MISSING}')
        }

    });


    it('should not expand partially matching variable name', function () {
        let rawText = '${ENVVAR_MISSING}';

        try{
            expandenv(rawText);
        } catch (e){
            expect(e.message).to.be('Reference to environment variable ${ENVVAR_MISSING} could not be resolved: ${ENVVAR_MISSING}')
        }

    });

});