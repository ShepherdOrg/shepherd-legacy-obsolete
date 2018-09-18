describe('inject dependency injection', function(){
    const inject = require('./inject');

    it('should return injected dependency',function(){
        let deps = inject({
            foo:"bar"
        });
        expect(deps("foo")).to.eql('bar');
    });

    it('should fail on missing dependency',function(){
        try{
            let deps = inject({
                foo:"bar"
            });
            deps("baz");
        }  catch (e){
            expect(e.message).to.eql('Required dependency <baz> is not provided.');
        }
    });

    it('should not fail on optional missing dependency', function(){
        let deps = inject({
            x:"bar"
        });
        expect(deps("foo", true)).to.eql(undefined);
    })

});