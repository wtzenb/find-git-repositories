const assert = require('assert');
const mlog = require('mocha-logger');
const path = require('path');
const rimraf = require('rimraf');

const createTree = require('./createTree');
const findGitRepos = require('../');

describe('findGitRepos', function() {
  describe('Arguments', function() {
    it('will fail if not provided a path', function(done) {
      findGitRepos()
        .then(() => done('Should not have succeeded'))
        .catch(() => done());
    });

    it('will fail if not provided a progress callback', function(done) {
      findGitRepos('test')
        .then(() => done('Should not have succeeded'))
        .catch(() => done());
    });
  });

  describe('Features', function() {
    this.timeout(240000);

    const basePath = path.resolve('.', 'fs');
    const breadth = 5;
    const depth = 8;

    before(function() {
      const { numDirs, repositoryPaths } = createTree(basePath, breadth, depth);
      this.repositoryPaths = repositoryPaths;
      mlog.log(`[FS] Breadth: ${breadth}`);
      mlog.log(`[FS] Depth: ${depth}`);
      mlog.log(`[FS] Directory Count: ${numDirs}`);
    });

    beforeEach(function() {
      const { repositoryPaths } = this;
      Object.keys(repositoryPaths).forEach(repositoryPath => {
        repositoryPaths[repositoryPath] = false;
      });
    });

    it('can find all repositories in a file system', function(done) {
      const { repositoryPaths } = this;
      let callbackPromisesChain = Promise.resolve();
      let triggeredProgressCallbackOnce = false;

      const progressCallback = paths => {
        triggeredProgressCallbackOnce = true;

        callbackPromisesChain = paths.reduce((chain, repositoryPath) =>
          chain.then(() => {
            assert.equal(
              repositoryPaths[repositoryPath],
              Boolean(repositoryPaths[repositoryPath]),
              'Found a repo that should not exist'
            );
            assert.equal(repositoryPaths[repositoryPath], false, 'Duplicate repositoryPath received');
            repositoryPaths[repositoryPath] = true;
          }), callbackPromisesChain);
      };

      findGitRepos(basePath, progressCallback)
        .then(paths => Promise.all([paths, callbackPromisesChain]))
        .then(([paths]) => {
          assert.equal(triggeredProgressCallbackOnce, true, 'Never called progress callback');
          paths.forEach(repositoryPath => {
            assert.equal(
              repositoryPaths[repositoryPath],
              Boolean(repositoryPaths[repositoryPath]),
              'Found a repo that should not exist'
            );
            repositoryPaths[repositoryPath] = true;
          });

          Object.keys(repositoryPaths).forEach(repositoryPath => {
            assert.equal(repositoryPaths[repositoryPath], true, 'Did not find a path in the file system');
          });
        })
        .then(() => done())
        .catch(error => done(error));
    });
  });
});
