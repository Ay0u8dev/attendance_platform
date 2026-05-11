pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                checkout scm
            }
        }


        stage('Backend Tests') {
            steps {
                dir('backend/auth-service') {
                    sh 'chmod +x mvnw'
                    sh './mvnw test'
                }

                dir('backend/user-service') {
                    sh 'chmod +x mvnw'
                    sh './mvnw test'
                }

                dir('backend/attendance-service') {
                    sh 'chmod +x mvnw'
                    sh './mvnw test'
                }
            }
        }

        stage('Docker Compose Build') {
            steps {
                echo 'Building Docker images...'
                sh 'docker compose -f docker-compose.prod.yml build'
            }
        }

        stage('Trivy Security Scan') {
            steps {
                sh '''
                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v trivy-cache:/root/.cache/ \
                aquasec/trivy image \
                --severity HIGH,CRITICAL \
                --exit-code 1 \
                attendance-platform-cicd-frontend:latest

                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v trivy-cache:/root/.cache/ \
                aquasec/trivy image \
                --severity HIGH,CRITICAL \
                --exit-code 1 \
                attendance-platform-cicd-auth-service:latest

                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v trivy-cache:/root/.cache/ \
                aquasec/trivy image \
                --severity HIGH,CRITICAL \
                --exit-code 1 \
                attendance-platform-cicd-user-service:latest

                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v trivy-cache:/root/.cache/ \
                aquasec/trivy image \
                --severity HIGH,CRITICAL \
                --exit-code 1 \
                attendance-platform-cicd-attendance-service:latest
                '''
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    file(credentialsId: 'attendance-env-prod', variable: 'ENV_FILE')
                ]) {
                    echo 'Deploying application...'

                    sh 'cp $ENV_FILE .env.prod'

                    sh 'docker compose -f docker-compose.prod.yml down'                    
                    sh 'docker compose -f docker-compose.prod.yml up -d'
                }
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