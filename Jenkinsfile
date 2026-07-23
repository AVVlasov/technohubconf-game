pipeline {
    agent {
        docker {
            image 'node:20'
        }
    }

    stages {
        stage('install') {
            steps {
                sh 'node -v'
                sh 'npm -v'
                script {
                    String tag = sh(returnStdout: true, script: 'git tag --contains').trim()
                    String branchName = sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD').trim()
                    String commit = sh(returnStdout: true, script: 'git log -1 --oneline').trim()
                    String commitMsg = commit.substring(commit.indexOf(' ')).trim()

                    if (tag) {
                        currentBuild.displayName = "#${BUILD_NUMBER}, tag ${tag}"
                    } else {
                        currentBuild.displayName = "#${BUILD_NUMBER}, branch ${branchName}"
                    }

                    String author = sh(returnStdout: true, script: "git log -1 --pretty=format:'%an'").trim()
                    currentBuild.description = "${author}<br />${commitMsg}"
                    echo 'starting installing'
                    sh 'npm ci'
                }
            }
        }

        stage('checks') {
            parallel {
                stage('eslint') {
                    steps {
                        sh 'npm run eslint'
                    }
                }

                stage('build') {
                    steps {
                        sh 'npm run build'
                    }
                }
            }
        }

        stage('clean-all') {
            steps {
                sh 'rm -rf .[!.]*'
                sh 'rm -rf ./*'
                sh 'ls -a'
            }
        }
    }
}
