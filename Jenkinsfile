node() {
    try {
        // This is the official version label for this project.
        env.MAJOR_MINOR="0.1"

        stage('Cleanup workspace'){
            sh 'sudo chown -R ${USER}:${USER} .' // Because Docker output is owned by root
            deleteDir()
        }

        stage('Checkout'){
            // Checkout code from repository
            checkout scm
            env.GIT_VERSION = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
        }


        def branchName = env.BRANCH_NAME ? env.BRANCH_NAME : 'master'
        env.SEMANTIC_VERSION = env.MAJOR_MINOR + '.' + env.BUILD_NUMBER + '-' + branchName.replaceAll('/','_')

        print "Building shepherd version " + env.SEMANTIC_VERSION

        withEnv(["MAJOR_MINOR=${env.MAJOR_MINOR}",
                 "BUILD_NUMBER=${env.BUILD_NUMBER}",
                 "GIT_VERSION=${env.GIT_VERSION}",
                 "SEMANTIC_VERSION=${env.SEMANTIC_VERSION}",
        ]) {

            stage('Shepherd agent image') {
                sh 'cd agent && make build-docker'
            }

            stage('Specs and integration tests') {
                sh 'cd agent && make ci'
            }

            stage('Docker push') {
                withCredentials([usernamePassword(credentialsId: 'icelandairci-dockerhub', usernameVariable: 'DOCKERUSERNAME', passwordVariable: 'DOCKERPASSWORD')]) {
                    sh 'echo ${DOCKERPASSWORD} | docker login -u ${DOCKERUSERNAME} --password-stdin'
                    sh 'cd agent && make push-docker'
                    sh 'docker logout'
                }
            }

        }
    } catch (err) {
        currentBuild.result = "FAILURE"

        def slack =  fileLoader.fromGit(
                'slack/slack',
                'https://github.com/Icelandair/jenkins.common-pipeline-scripts.git',
                'master',
                'a2a08cde-b36d-4ee8-9399-616434214fcb',
                ''
        )
        slack.sendBuildFailed()

        throw err
    }
}
