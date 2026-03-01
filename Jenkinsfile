pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                echo 'Building...'
                sh 'echo Build stage complete'
            }
        }
        stage('Test') {
            steps {
                echo 'Testing...'
                sh 'echo Test stage complete'
            }
        }
    }
    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
