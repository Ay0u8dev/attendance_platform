pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                checkout scm
            }
        }

        // stage('Backend Build') {
        //     steps {
        //         echo 'Building Spring services...'
        //         sh './mvnw clean package -DskipTests'
        //     }
        // }

        // stage('Frontend Build') {
        //     steps {
        //         dir('frontend') {
        //             echo 'Building Angular frontend...'
        //             sh 'npm install'
        //             sh 'npm run build'
        //         }
        //     }
        // }

        stage('Docker Compose Build') {
            steps {
                echo 'Building Docker images...'
                sh 'docker compose -f docker-compose.prod.yml build'
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
                    
                    // Wait for services to be healthy
                    timeout(time: 5, unit: 'MINUTES') {
                        sh '''
                            echo "Waiting for services to be healthy..."
                            docker compose -f docker-compose.prod.yml ps
                            # Add specific health check commands as needed
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            sh 'rm -f .env.prod'
        }
        success {
            echo 'Pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed!'
        }
    }
}