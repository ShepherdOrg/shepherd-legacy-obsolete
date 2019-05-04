const expandtemplate = require('./expandtemplate');

describe('expand environment vars using handlebars template syntax', function () {

    beforeEach(function () {
        process.env.ENVVAR_ONE = 'TESTVALUE';
    });

    afterEach(function () {
        delete process.env.ENVVAR_ONE;
    });

    it('should expand simple variable', function () {
        let rawText = '{{ENVVAR_ONE}}';

        let expandedText = expandtemplate(rawText);

        expect(expandedText).to.be('TESTVALUE');
    });

    it('should throw on missing variable', () => {
        try{
            expandtemplate('{{ENVVAR_MISSING}}')
        }catch(err){
            expect(err.message).to.contain('ENVVAR_MISSING')
        }
    });

    describe('Base64 encode', ()=>{

        it('Should support base64 encode', ()=>{
            let rawText = 'ENCODED: {{Base64Encode ENVVAR_ONE }}';

            let expandedText = expandtemplate(rawText);

            expect(expandedText).to.be('ENCODED: VEVTVFZBTFVF');
        })

        it('Should support base64 encode with newline appended', ()=>{
            let rawText = 'ENCODED: {{{Base64Encode ENVVAR_ONE "\n"}}}';

            let expandedText = expandtemplate(rawText);

            expect(expandedText).to.be('ENCODED: VEVTVFZBTFVFCg==');
        })
    })

    // it('should throw on missing variable', function () {
    //     let rawText = '${ENVVAR_MISSING}';
    //
    //     try{
    //         expandenv(rawText);
    //     } catch (e){
    //         expect(e.message).to.be('Reference to environment variable ${ENVVAR_MISSING} could not be resolved: ${ENVVAR_MISSING}')
    //     }
    //
    // });
    //
    //
    // it('should not expand partially matching variable name', function () {
    //     let rawText = '${ENVVAR_MISSING}';
    //
    //     try{
    //         expandenv(rawText);
    //     } catch (e){
    //         expect(e.message).to.be('Reference to environment variable ${ENVVAR_MISSING} could not be resolved: ${ENVVAR_MISSING}')
    //     }
    //
    // });

});